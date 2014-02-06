/*global MM, _, observable, jQuery*/
MM.MeasuresModel = function (configAttributeName, valueAttrName, mapController) {
	'use strict';
	var self = observable(this),
		activeContent,
		measures = [],
		latestMeasurementValues = [],
		filter,
		getActiveContentMeasures = function () {
			var value = activeContent && activeContent.getAttr(configAttributeName);
			if (!_.isArray(value)) {
				return [];
			}
			return value;
		},
		mapMeasurements = function (measurements) {
			var map = {};
			_.each(measurements, function (measurement) {
				map[measurement.id] = measurement;
			});
			return map;
		},
		measurementValueDifferences = function (measurement, baseline) {
			var difference = [];
			_.each(measurement.values, function (value, key) {
				var baselineValue = (baseline && baseline.values && baseline.values[key]) || 0;
				if (value !== baselineValue) {
					difference.push(['measureValueChanged', measurement.id, key, value || 0]);
				}
			});
			if (baseline) {
				_.each(baseline.values, function (value, key) {
					var noNewValue = !measurement || !measurement.values || !measurement.values[key];
					if (noNewValue) {
						difference.push(['measureValueChanged', baseline.id, key, 0]);
					}
				});
			}
			return difference;
		},
		measurementDifferences = function (measurements, baslineMeasurements) {
			/*{id: 11, title: 'with values', values: {'Speed': 1, 'Efficiency': 2}}*/
			var baslineMeasurementsMap = mapMeasurements(baslineMeasurements),
				differences = [];
			_.each(measurements, function (measurement) {
				var baseline = baslineMeasurementsMap[measurement.id];
				differences = differences.concat(measurementValueDifferences(measurement, baseline));
			});
			return differences;
		},
		dispatchMeasurementChangedEvents = function () {
			if (self.listeners('measureValueChanged').length === 0) {
				return;
			}
			var oldMeasurementValues = latestMeasurementValues,
				differences = measurementDifferences(self.getMeasurementValues(), oldMeasurementValues);
			_.each(differences, function (changeArgs) {
				self.dispatchEvent.apply(self, changeArgs);
			});
		},
		onActiveContentChange = function () {
			var measuresBefore = measures;
			measures = getActiveContentMeasures();
			if (self.listeners('measureRemoved').length > 0) {
				_.each(_.difference(measuresBefore, measures), function (measure) {
					self.dispatchEvent('measureRemoved', measure);
				});
			}
			if (self.listeners('measureAdded').length > 0) {
				_.each(_.difference(measures, measuresBefore), function (measure) {
					self.dispatchEvent('measureAdded', measure, measures.indexOf(measure));
				});
			}
			dispatchMeasurementChangedEvents();
		};
	mapController.addEventListener('mapLoaded', function (id, content) {
		if (activeContent) {
			activeContent.removeEventListener('changed', onActiveContentChange);
		}
		activeContent = content;
		measures = getActiveContentMeasures();
		activeContent.addEventListener('changed', onActiveContentChange);
	});
	self.getMeasures = function () {
		return measures.slice(0);
	};
	self.editWithFilter = function (newFilter) {
		filter = newFilter;
		self.dispatchEvent('measuresEditRequested');
	};
	self.getMeasurementValues = function () {
		if (!activeContent) {
			return [];
		}
		var result = [];
		activeContent.traverse(function (idea) {
			if (!filter || !filter.nodeIds || _.include(filter.nodeIds, idea.id)) {
				result.push({
					id: idea.id,
					title: idea.title,
					values: _.extend({}, idea.getAttr(valueAttrName))
				});
			}
		});
		latestMeasurementValues = result.slice(0);
		return result;
	};
	self.addMeasure = function (measureName) {
		if (!measureName || measureName.trim() === '') {
			return false;
		}
		measureName = measureName.trim();

		if (_.find(measures, function (measure) { return measure.toUpperCase() === measureName.toUpperCase(); })) {
			return false;
		}
		activeContent.updateAttr(activeContent.id, configAttributeName, measures.concat([measureName]));
	};
	self.removeMeasure = function (measureName) {
		if (!measureName || measureName.trim() === '') {
			return false;
		}
		var updated = _.without(measures, measureName);
		if (_.isEqual(updated, measures)) {
			return;
		}
		activeContent.updateAttr(activeContent.id, configAttributeName, updated);
	};
	self.validate = function (value) {
		return !isNaN(parseFloat(value)) && isFinite(value);
	};
	self.setValue = function (nodeId, measureName, value) {
		if (!self.validate(value)) {
			return false;
		}
		return activeContent.mergeAttrProperty(nodeId, valueAttrName, measureName, value);
	};
};



jQuery.fn.editByActivatedNodesWidget = function (keyStroke, mapModel, measuresModel) {
	'use strict';
	return jQuery.each(this, function () {
		var element = jQuery(this),
			showModal = function () {
				if (mapModel.getInputEnabled()) {
					measuresModel.editWithFilter({nodeIds: mapModel.getActivatedNodeIds()});
				}
			};

		element.keydown(keyStroke, showModal).find('[data-mm-role=activatedNodesMeasureSheet]').click(showModal);
	});
};