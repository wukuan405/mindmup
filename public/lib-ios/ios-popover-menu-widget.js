/*global jQuery, window, MM, observable, _ */
MM.IOSStageAPI = function () {
	'use strict';
	var self = observable(this);
	self.togglePopoverMenu = function () {
		var selected = jQuery('.mapjs-node.selected'),
				rect = selected && self.getRectForNode(selected),
				touchPoint = rect && self.getTouchPointForRect(rect);
				// checkRect = jQuery('<div>');
		if (!touchPoint) {
			return;
		}
		self.dispatchEvent('togglePopover', touchPoint, true);
	};
	self.getRectForNode = function (node) {
		var stage = jQuery('[data-mapjs-role=stage]'),
				scale = stage && stage.data && stage.data('scale'),
				offset = node && node.offset && node.offset(),
				width = node && node.outerWidth && node.outerWidth(),
				height = node && node.outerHeight && node.outerHeight();
		if (!stage || !scale || !offset || !width || !height) {
			return false;
		}
		return {left: offset.left, top: offset.top, width: width * scale, height: height * scale};
	};
	self.getTouchPointForRect = function (rect) {
		var	body = jQuery('body'),
				bodyWidth = body && body.innerWidth(),
				bodyHeight = body && body.innerHeight(),
				top = bodyHeight && rect && Math.min(bodyHeight, Math.max(0, rect.top + rect.height / 2)),
				left = bodyWidth && rect && Math.min(bodyWidth, Math.max(0, rect.left + rect.width / 2));

		if (top && left) {
			return {x: left, y: top};
		}
		return false;
	};
};

jQuery.fn.iosPopoverMenuWidget = function (stageApi) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				toolbar = element.find('[data-mm-role~="popover-toolbar"]'),
				topPointer = element.find('[data-mm-role="popover-pointer-top"]'),
				bottomPointer = element.find('[data-mm-role="popover-pointer-bottom"]'),
				hidePopover = function () {
					if (element.is(':visible')) {
						element.unbind('click');
						element.hide();
					}
				},
				backgroundClick = function () {
					hidePopover();
				},
				setupBackgroundClick = function (ignoreVisibility) {
					if (ignoreVisibility ||  element.is(':visible')) {
						element.click(backgroundClick);
					}
				},
				calcTopBottomHeight = function () {
					return (element.height() -  toolbar.outerHeight() + 20);
				},
				showPopover = function (evt) {
					var x = evt.x,
							y = evt.y,
							topBottomHeight = calcTopBottomHeight(),
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
					// if (!ignoreBackGroundClick) {
					if (evt.noDelay) {
						setupBackgroundClick(true);
					} else {
						window.setTimeout(setupBackgroundClick, 1000);
					}
					element.show();
				};
		toolbar.click(function (e) {
			e.preventDefault();
			e.stopPropagation();
		});
		element.find('[data-mm-role~="popover-close"]').click(hidePopover);
		element.on('hidePopover', function () {
			hidePopover();
		});
		element.on('showPopover', showPopover);
		if (stageApi) {
			stageApi.topBottomHeight = calcTopBottomHeight();
			stageApi.addEventListener('togglePopover', function (evt) {
				if (element.is(':visible')) {
					hidePopover();
				} else {
					showPopover(_.extend({}, evt, {noDelay: true}));
				}
			});
		}
	});
};