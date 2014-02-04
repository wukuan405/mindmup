/*global MM, _, observable, jQuery*/
MM.MeasuresModel = function (configAttributeName, valueAttrName, mapController) {
	'use strict';
	var self = observable(this),
		activeContent,
		measures = [],
		filter,
		getActiveContentMeasures = function () {
			var value = activeContent && activeContent.getAttr(configAttributeName);
			if (!_.isArray(value)) {
				return [];
			}
			return value;
		},
		onActiveContentChange = function () {
			var latestMeasures = getActiveContentMeasures(),
				added = _.difference(latestMeasures, measures),
				removed = _.difference(measures, latestMeasures);
			_.each(removed, function (measure) {
				self.dispatchEvent('measureRemoved', measure);
			});
			_.each(added, function (measure) {
				self.dispatchEvent('measureAdded', measure, latestMeasures.indexOf(measure));
			});
			measures = latestMeasures;
		};
	mapController.addEventListener('mapLoaded', function (id, content) {
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