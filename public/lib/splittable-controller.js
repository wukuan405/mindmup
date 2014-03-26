/*global MM, observable, _*/
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
	self.split = function (position) {
		if (!_.contains(allPositions, position)) {
			return false;
		}
		element.removeClass(allPositions.join(' ')).addClass(position);
		this.dispatchEvent('split', position);
		return true;
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
			return false;
		}
		if (currentSplit === MM.SplittableController.ROW_SPLIT) {
			return self.split(MM.SplittableController.COLUMN_SPLIT);
		} else {
			return self.split(MM.SplittableController.ROW_SPLIT);
		}
	};
};
MM.SplittableController.NO_SPLIT = 'no-split';
MM.SplittableController.COLUMN_SPLIT = 'column-split';
MM.SplittableController.ROW_SPLIT = 'row-split';