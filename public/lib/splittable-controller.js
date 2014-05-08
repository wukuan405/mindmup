/*global MM, observable, _, jQuery, document*/
MM.SplittableController = function (element, mapModel, storage, storageKey, defaultContent) {
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
		mapModel.centerOnNode(mapModel.getCurrentlySelectedIdeaId());
		return true;
	};
	self.currentSplit = function () {
		var bodyPosition = _.find(allPositions, function (position) {
			return element.hasClass(position);
		});
		return bodyPosition || MM.SplittableController.NO_SPLIT;
	};
	self.toggle = function (elementId) {
		if (elementId === storage[storageKey]) {
			if (self.currentSplit() === MM.SplittableController.NO_SPLIT) {
				self.split(calcSplit());
			} else {
				self.split(MM.SplittableController.NO_SPLIT);
			}
		} else {
			element.find('[data-mm-role=optional-content]').hide();
			element.find('#' + elementId).show();
			if (self.currentSplit() === MM.SplittableController.NO_SPLIT) {
				self.split(calcSplit());
			}
		}
		storage[storageKey] = elementId;

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
	element.find('[data-mm-role=optional-content]').hide();

	if (!storage[storageKey]) {
		storage[storageKey] = defaultContent;
	}
	element.find('#' + storage[storageKey]).show();

};

MM.SplittableController.NO_SPLIT = 'no-split';
MM.SplittableController.COLUMN_SPLIT = 'column-split';
MM.SplittableController.ROW_SPLIT = 'row-split';


jQuery.fn.optionalContentWidget = function (mapModel, splittableController) {
	'use strict';
	var	toggleMeasures = function (force, splitContentId) {
			if (force || mapModel.getInputEnabled()) {
				splittableController.toggle(splitContentId);
			}
		};

	return jQuery.each(this, function () {
		var element = jQuery(this),
			id = element.attr('id');
		jQuery(document).keydown(element.attr('data-mm-activation-key'), toggleMeasures.bind(element, false, id));
		jQuery('[data-mm-role=' + element.attr('data-mm-activation-role') + ']').click(toggleMeasures.bind(element, true, id));
	});
};