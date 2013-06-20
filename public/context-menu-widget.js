/*global jQuery,document, _*/
jQuery.fn.contextMenuWidget = function (mapModel) {
	'use strict';
	var content = this.find('[data-mm-context-menu]').clone(),
		element = jQuery('<ul class="dropdown-menu">').css('position', 'absolute').css('z-index', '999').hide().appendTo('body'),
		hide = function () {
			if (element.is(':visible')) {
				element.hide();
				jQuery(document).off('click touch keydown', hide);
			}
		},
		topMenus = { },
		getTopMenu = function (label) {
			if (!topMenus[label]) {
				var dropDownMenu = jQuery('<li class="dropdown-submenu"><a tabindex="-1" href="#"></a><ul class="dropdown-menu"></ul></li>').appendTo(element);
				dropDownMenu.find('a').text(label);
				topMenus[label] = dropDownMenu.find('ul');
			}
			return topMenus[label];
		};
	content.find('a').attr('data-category', 'Context Menu');
	_.each(content, function (menuItem) {
		var submenu = jQuery(menuItem).attr('data-mm-context-menu');

		if (submenu) {
			getTopMenu(submenu).append(menuItem);
		} else {
			element.append(menuItem);
		}
	});
	mapModel.addEventListener('mapMoveRequested mapScaleChanged', hide);
	mapModel.addEventListener('contextMenuRequested', function (nodeId, x, y) {
		element.css('left', x).css('top', y).css('display', 'block').show();
		jQuery(document).on('click touch keydown', hide);
	});
	return element;
};
