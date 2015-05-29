/*global jQuery */
jQuery.fn.flexiToolbarWidget = function (mapModel) {
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
		mapModel.addEventListener('nodeSelectionChanged', function (id, isSelected) {
			if (isSelected) {
				var isRoot = (id == mapModel.getIdea().id);
				if (isRoot) {
					element.find('[data-mm-requirement="no-root"]').addClass('disabled');
				} else {
					element.find('[data-mm-requirement="no-root"]').removeClass('disabled');
				}
			}
		});
		element.find('[data-mm-map-model]').click(function () {
			mapModel[this.getAttribute('data-mm-map-model')]('flexi-toolbar');
		});

	});
};
