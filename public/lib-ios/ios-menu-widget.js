/*global $*/
$.fn.iosMenuWidget = function (mapModel) {
	'use strict';
	return $(this).each(function () {
		var element = $(this),
				defaultMenuName = element.data('mm-default-menu'),
				toolbar = element.find('[data-mm-role="ios-toolbar"]'),
				menuTitle = element.find('[data-mm-role="ios-menu-title"]'),
				source = element.data('mm-source') || 'ios',
				defaultToggleText = menuTitle.text(),
				menuStack = [],
				showMenu = function (menuName, pushToStack) {
					element.find('[data-mm-menu][data-mm-menu!="' + menuName + '"]').hide();
					element.find('[data-mm-menu="' + menuName + '"]').show();
					if (pushToStack) {
						menuStack.push(menuName);
					}
					if (menuStack.length === 0) {
						menuTitle.text(defaultToggleText);
					} else {
						menuTitle.text('Back');
					}
				};

		element.find('[data-mm-menu][data-mm-menu!="' + defaultMenuName + '"]').hide();
		element.find('[data-mm-role="ios-menu-toggle"]').click(function () {
			if (!toolbar.is(':visible')) {
				menuTitle.text(defaultToggleText);
				toolbar.show();
			} else {
				if (menuStack.length > 0) {
					menuStack.pop();
					if (menuStack.length > 0) {
						showMenu(menuStack[menuStack.length - 1]);
					} else {
						showMenu(defaultMenuName);
					}
				} else {
					toolbar.hide();
					menuTitle.text('Show Menu');
				}
			}
		});
		element.find('[data-mm-menu-role="showMenu"]').click(function () {
			var clickElement = $(this),
					menu = clickElement.data('mm-action');
			if (menu) {
				showMenu(menu, true);
			}
		});
		element.find('[data-mm-menu-role="modelAction"]').click(function () {
			var clickElement = $(this),
					action = clickElement.data('mm-action');
			if (action && mapModel && mapModel[action]) {
				mapModel[action](source);
			}
		});

	});
};