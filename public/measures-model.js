/*global MM, _, observable, jQuery*/
MM.MeasuresModel = function (configAttributeName, valueAttrName, mapController) {
	'use strict';
	var self = observable(this),
		activeContent,
		filter;
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