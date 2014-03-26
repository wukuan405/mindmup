/*global MM, jQuery, observable, _*/
MM.SplittableController = function (element) {
	'use strict';
	var self = observable(this),
		allPositions = [MM.SplittableController.NO_SPLIT, MM.SplittableController.ROW_SPLIT, MM.SplittableController.COLUMN_SPLIT],
		calcSplit = function () {
			if (element.innerHeight() > element.innerWidth()) {
				return MM.SplittableController.ROW_SPLIT;
			} else {
				return MM.SplittableController.COLUMN_SPLIT;
			}
		};
	self.split =	 function (position) {
		element.removeClass(allPositions.join(' ')).addClass(position);
		this.dispatchEvent('split', position);
	};
	self.currentSplit = function () {
		var bodyPosition = _.find(allPositions, function (position) {
			return element.hasClass(position);
		});
		return bodyPosition || MM.SplittableController.NO_SPLIT;
	};
	self.toggle = function () {
		if (self.currentSplit() === MM.SplittableController.NO_SPLIT) {
			self.split(calcSplit());
		} else {
			self.split(MM.SplittableController.NO_SPLIT);
		}
	};
	self.flip = function () {
		var currentSplit = self.currentSplit();
		if (currentSplit === MM.SplittableController.NO_SPLIT) {
			return;
		}
		if (currentSplit === MM.SplittableController.ROW_SPLIT) {
			self.split(MM.SplittableController.COLUMN_SPLIT);
		} else {
			self.split(MM.SplittableController.ROW_SPLIT);
		}
	};
};
MM.SplittableController.NO_SPLIT = 'no-split';
MM.SplittableController.COLUMN_SPLIT = 'column-split';
MM.SplittableController.ROW_SPLIT = 'row-split';

jQuery.fn.splitFlipWidget = function (splittableController, menuSelector, mapModel, keyStroke) {
	'use strict';
	var self = jQuery(this),
		onFlipRequest = function (force) {
			console.log('onFlipRequest', force, arguments);
			if (force || mapModel.isEditingEnabled()) {
				splittableController.flip();
			}

		};
	_.each(self.find(menuSelector), function (elem) {
		var element = jQuery(elem);
		element.click(function () {
			onFlipRequest(true);
		});
	});
	self.keydown(keyStroke, onFlipRequest.bind(self, false));
	return self;
};
jQuery.fn.splittableWidget = function (splittableController, minTop) {
	'use strict';
	var element = jQuery(this),
		defaultArea = element.find('[data-mm-role=default]'),
		optionalArea = element.find('[data-mm-role=optional]'),
		doSplit = function (position) {
			var optionalAreaCss,
				defaultAreaCss,
				wasVisible;
			if (position === MM.SplittableController.COLUMN_SPLIT) {
				optionalAreaCss = {
					'top': minTop,
					'left': '50%',
					'width': '50%',
					'height': '100%',
					'min-height': '100%',
					'display': 'block',
					'position': 'absolute'
				};
				defaultAreaCss = {
					'top': minTop,
					'left': 0,
					'width': '50%',
					'height': '100%',
					'min-height': '100%',
					'display': 'block',
				};
			} else if (position === MM.SplittableController.ROW_SPLIT) {
				optionalAreaCss = {
					'top': '50%',
					'left': 0,
					'width': '100%',
					'height': '50%',
					'min-height': 0,
					'display': 'block',
					'position': 'inherit'
				};
				defaultAreaCss = {
					'top': 0,
					'left': 0,
					'width': '100%',
					'height': '50%',
					'min-height': 0,
					'display': 'block'
				};
			} else {
				optionalAreaCss = {
					'display': 'none'
				};
				defaultAreaCss = {
					'top': 0,
					'left': 0,
					'width': '100%',
					'height': '100%',
					'min-height': '100%',
					'display': 'block'
				};
			}
			wasVisible = optionalArea.is(':visible');
			defaultArea.css(defaultAreaCss);
			optionalArea.css(optionalAreaCss);
			if (optionalArea.is(':visible') && !wasVisible) {
				optionalArea.trigger('show');
			} else if (!optionalArea.is(':visible') && wasVisible) {
				optionalArea.trigger('hide');
			}
		};
	splittableController.addEventListener('split', doSplit);
	doSplit(splittableController.currentSplit());
	return element;
};
