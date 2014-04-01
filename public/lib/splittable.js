/*global MM, jQuery, window*/

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
					'display': 'block'
				};
				defaultAreaCss = {
					'top': minTop
				};
			} else if (position === MM.SplittableController.ROW_SPLIT) {
				optionalAreaCss = {
					'top': '50%',
					'display': 'block'
				};
				defaultAreaCss = {
					'top': 0
				};
			} else {
				optionalAreaCss = {
					'top': 0,
					'display': 'none'
				};
				defaultAreaCss = {
					'top': 0
				};
			}
			wasVisible = optionalArea.is(':visible');
			defaultArea.css(defaultAreaCss);
			if (!window || !window.MutationObserver || defaultArea.data('mm-context') === 'embedded') {
				defaultArea.trigger(jQuery.Event('resize'));
			}
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
