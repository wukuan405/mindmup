/*global jQuery, _*/
jQuery.fn.modalMeasuresSheetWidget = function (measuresModel) {
	'use strict';
	return jQuery.each(this, function () {
		var element = jQuery(this),
			measurementTemplate = element.find('[data-mm-role=measurement-template]'),
			measurementContainer = measurementTemplate.parent(),
			ideaTemplate = element.find('[data-mm-role=idea-template]'),
			ideaContainer = ideaTemplate.parent();

		measurementTemplate.detach();
		ideaTemplate.detach();
		element.on('shown', function () {
			element.find('.btn-primary').focus();
		});
		element.on('show', function () {
			measurementContainer.children('[data-mm-role=measurement-template]').remove();
			var measures = measuresModel.getMeasures();
			_.each(measures, function (m) {
				measurementTemplate.clone().appendTo(measurementContainer).text(m);
			});
			ideaContainer.children('[data-mm-role=idea-template]').remove();
			_.each(measuresModel.getMeasurementValues(), function (mv) {
				var newIdea = ideaTemplate.clone().appendTo(ideaContainer),
					valueTemplate = newIdea.find('[data-mm-role=value-template]'),
					valueContainer = valueTemplate.parent();
				valueTemplate.detach();
				newIdea.find('[data-mm-role=idea-title]').text(mv.title);
				_.each(measures, function (measure) {
					valueTemplate.clone().appendTo(valueContainer).text(mv.values[measure] || '0');
				});
			});
		});

		element.modal({keyboard: true, show: false});

		measuresModel.addEventListener('measuresEditRequested', function () {
			element.modal('show');
		});

		/*
		model.editWithFilter(filter)

		*/
	});
};
