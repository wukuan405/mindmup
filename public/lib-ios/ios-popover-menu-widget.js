/*global jQuery, window */
jQuery.fn.iosPopoverMenuWidget = function () {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				toolbar = element.find('[data-mm-role~="popover-toolbar"]'),
				topPointer = element.find('[data-mm-role="popover-pointer-top"]'),
				bottomPointer = element.find('[data-mm-role="popover-pointer-bottom"]'),
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
		element.find('[data-mm-role~="popover-close"]').click(hideToolbar);
		element.on('hidePopover', function () {
			hideToolbar();
		});
		element.on('showPopover', function (evt) {
			var x = evt.x,
					y = evt.y,
					topBottomHeight = (element.height() -  toolbar.outerHeight() + 20),
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
			toolbar.css({'top': Math.max(-20, top) + 'px', 'left': left + 'px'});
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