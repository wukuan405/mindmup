/*global jQuery, window */
jQuery.fn.iosContextMenuWidget = function (mapModel, tools) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				toolbar = element.find('[data-mm-role~="context-menu-toolbar"]'),
				toolContainer = element.find('[data-mm-role~="context-menu-tool-container"]'),
				topPointer = element.find('[data-mm-role="toolbar-pointer-top"]'),
				bottomPointer = element.find('[data-mm-role="toolbar-pointer-bottom"]'),
				hideToolbar = function () {
					if (element.is(':visible')) {
						element.unbind('click');
						element.hide();
					}
				},
				backgroundClick = function () {
					hideToolbar();
				};
		toolbar.click(function (e) {
			e.preventDefault();
			e.stopPropagation();
		});
		if (tools) {
			tools.each(function () {
				jQuery(this).clone(true).css('display', '').appendTo(toolContainer).click(function () {
					hideToolbar();
				});
			});
		}
		mapModel.addEventListener('contextMenuRequested', function (nodeId, x, y) {
			var topBottomHeight = (element.height() -  toolbar.outerHeight() + 20),
					showAbove = (y > topBottomHeight),
					maxLeft = element.width() - toolbar.outerWidth() - 10,
					minLeft = 10,
					left = Math.max(minLeft, Math.min(maxLeft, x - (toolbar.outerWidth() / 2))),
					top = showAbove ? (y - toolbar.outerHeight() - 10) : y + 10,
					pointerMinLeft = 20,
					pointerMaxLeft = toolbar.outerWidth() - 20,
					pointerLeft = Math.max(pointerMinLeft, Math.min(pointerMaxLeft, (x - left - 10)));
			if (showAbove) {
				bottomPointer.css('left', pointerLeft + 'px');
				topPointer.hide();
				bottomPointer.show();
			} else {
				topPointer.show();
				bottomPointer.hide();
				topPointer.css('left', pointerLeft + 'px');
			}
			toolbar.css({'top': top + 'px', 'left': left + 'px'});
			//stop the click handler being added to soon or it fires immediately
			window.setTimeout(function () {
				if (element.is(':visible')) {
					element.click(backgroundClick);
				}
			}, 1000);

			element.show();
		});
	});
};