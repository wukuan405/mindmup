/*global jQuery, _*/
jQuery.fn.modalMeasuresSheetWidget = function (measuresModel) {
	'use strict';
	return jQuery.each(this, function () {
		var element = jQuery(this),
			measurementTemplate = element.find('[data-mm-role=measurement-template]'),
			measurementContainer = measurementTemplate.parent(),
			ideaTemplate = element.find('[data-mm-role=idea-template]'),
			valueTemplate = ideaTemplate.find('[data-mm-role=value-template]').detach(),
			ideaContainer = ideaTemplate.parent(),
			addMeasureInput = element.find('[data-mm-role=measure-to-add]'),
			getRowForNodeId = function (nodeId) {
				return element.find('[data-mm-nodeid=' + nodeId + ']');
			},
			getColumnIndexForMeasure = function (measureName) {
				return _.map(measurementContainer.children(), function (column) {
					return jQuery(column).find('[data-mm-role=measurement-name]').text();
				}).indexOf(measureName);
			},
			appendMeasure = function (measureName, index) {
				var current = measurementContainer.children('[data-mm-role=measurement-template]').eq(index),
					measurement = measurementTemplate.clone();
				if (current.length) {
					measurement.insertBefore(current);
				} else {
					measurement.appendTo(measurementContainer);
				}
				measurement.find('[data-mm-role=measurement-name]').text(measureName);
				measurement.find('[data-mm-role=remove-measure]').click(function () {
					measuresModel.removeMeasure(measureName);
				});
			},
			appendMeasureValue = function (container, value, index) {
				var current = container.children('[data-mm-role=value-template]').eq(index);
				if (current.length) {
					valueTemplate.clone().insertBefore(current).text(value || '0');
				} else {
					valueTemplate.clone().appendTo(container).text(value || '0');
				}

			},
			onMeasureValueChanged = function (nodeId, measureChanged, newValue) {
				var row = getRowForNodeId(nodeId),
					col = getColumnIndexForMeasure(measureChanged);
				row.children().eq(col).text(newValue);
			},
			onMeasureAdded = function (measureName, index) {
				appendMeasure(measureName, index);

				_.each(ideaContainer.children(), function (idea) {
					appendMeasureValue(jQuery(idea), '0', index);
				});
			},
			onMeasureRemoved = function (measureName) {
				var col = getColumnIndexForMeasure(measureName);
				if (col < 0) {
					return;
				}
				measurementContainer.children().eq(col).remove();
				_.each(ideaContainer.children(), function (idea) {
					jQuery(idea).children().eq(col).remove();
				});
			};

		measurementTemplate.detach();
		ideaTemplate.detach();
		element.on('shown', function () {
			element.find('[data-dismiss=modal]').focus();
		});
		element.on('show', function () {
			measurementContainer.children('[data-mm-role=measurement-template]').remove();
			var measures = measuresModel.getMeasures();
			_.each(measures, function (m) {
				appendMeasure(m);
			});
			ideaContainer.children('[data-mm-role=idea-template]').remove();
			_.each(measuresModel.getMeasurementValues(), function (mv) {
				var newIdea = ideaTemplate.clone().appendTo(ideaContainer).attr('data-mm-nodeid', mv.id);
				newIdea.find('[data-mm-role=idea-title]').text(mv.title);
				_.each(measures, function (measure) {
					appendMeasureValue(newIdea, mv.values[measure]);
				});
			});
			measuresModel.addEventListener('measureValueChanged', onMeasureValueChanged);
			measuresModel.addEventListener('measureAdded', onMeasureAdded);
			measuresModel.addEventListener('measureRemoved', onMeasureRemoved);
		});
		element.on('hide', function () {
			measuresModel.removeEventListener('measureValueChanged', onMeasureValueChanged);
			measuresModel.removeEventListener('measureAdded', onMeasureAdded);
			measuresModel.removeEventListener('measureRemoved', onMeasureRemoved);
		});
		element.modal({keyboard: true, show: false});

		measuresModel.addEventListener('measuresEditRequested', function () {
			element.modal('show');
		});


		element.find('[data-mm-role=measure-to-add]').parent('form').on('submit', function () {
			measuresModel.addMeasure(addMeasureInput.val());
			addMeasureInput.val('');
			return false;
		});
	});
};
