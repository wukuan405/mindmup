/*global MM, _*/
MM.MeasuresModel = function (configAttributeName, valueAttrName, mapController) {
	'use strict';
	var self = this,
		activeContent;
	mapController.addEventListener('mapLoaded', function (id, content) {
		activeContent = content;
	});
	self.getMeasures = function () {
		var value = activeContent && activeContent.getAttr(configAttributeName);
		if (_.isArray(value)) {
			return value;
		}
		return [];
	};
	self.getMeasurementValues = function () {
		if (!activeContent) {
			return [];
		}
		var result = [];
		activeContent.traverse(function (idea) {
			result.push({
				id: idea.id,
				title: idea.title,
				values: _.extend({}, idea.getAttr(valueAttrName))
			});
		});
		return result;
	};
};
