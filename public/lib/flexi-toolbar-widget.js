/*global jQuery */
jQuery.fn.rotatingToolbarWidget = function () {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				showSection = function () {
					var	sectionToShow = jQuery(this).data('mm-target-section');
					element.find('[data-mm-section].active').removeClass('active').addClass('rotateOut');
					element.find('[data-mm-section="' + sectionToShow + '"]').addClass('active');
				};
		element.find('[data-mm-section]').on('transitionend', function (e) {
			if (e.target !== this) {
				return;
			}
			var el = jQuery(this);
			if (el.hasClass('rotateOut')) {
				el.removeClass('rotateOut active');
			}
		});
		element.find('[data-mm-section=main]').addClass('active');
		element.find('[data-mm-role=section]').click(showSection);
	});
};
jQuery.fn.nodeContextWidget = function (mapModel) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this);
		mapModel.addEventListener('nodeSelectionChanged', function (id, isSelected) {
			if (isSelected) {
				var context = mapModel.contextForNode(id);
				element.find('[data-mm-requirement]').each(function () {
					var jQElement = jQuery(this);
					if (!context[this.getAttribute('data-mm-requirement')]) {
						jQElement.addClass('disabled');
					} else {
						jQElement.removeClass('disabled');
					}
				});
			}
		});
		element.find('[data-mm-map-model]').click(function () {
			mapModel[this.getAttribute('data-mm-map-model')]('context-widget');
		});
	});
};
jQuery.fn.contextMenuLauncher = function (mapModel, stageContainer) {
	'use strict';
	return jQuery.each(this, function () {
		var element = jQuery(this),
				currentContextMenu,
				hideMenu = function () {
					if (currentContextMenu)	{
						currentContextMenu.popover('destroy');
						currentContextMenu = undefined;
					}
				},
				placement = function () {
					if (currentContextMenu.offset().top > stageContainer.innerHeight() - 260) {
						return 'top';
					}
					return 'bottom';
				};
		mapModel.addEventListener('contextMenuRequested', function (nodeId) {
			if (!mapModel.getEditingEnabled || mapModel.getEditingEnabled()) {
				var nodeElement = stageContainer.nodeWithId(nodeId);
				if (nodeElement && nodeElement.length) {
					currentContextMenu = nodeElement;
					mapModel.dispatchEvent('nodeVisibilityRequested', nodeId);
					element.find('[data-mm-menu]').hide();
					currentContextMenu.popover({
						html: true,
						title: '',
						placement: placement(),
						trigger: 'manual',
						container: 'body',
						content: function () {
							return element;
						}
					});
					currentContextMenu.popover('show');
				}
			}
		});
		mapModel.addEventListener('nodeSelectionChanged', hideMenu);
		element.find('[data-mm-show-menu]').click(function () {
			var menu = jQuery(this).data('mm-show-menu');
			element.find('[data-mm-menu=' + menu + ']').fadeToggle();
		});
		element.find('a').not('[data-mm-show-menu]').click(function () {
			var clickElement = jQuery(this);
			if (!clickElement.hasClass('disabled')) {
				hideMenu();
			}
		});
		stageContainer.on('scroll click blur', hideMenu);
	});
};
