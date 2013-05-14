/*global jQuery*/
jQuery.fn.titleUpdateWidget = function (mapController) {
	'use strict';
	var elements = this;
	mapController.addEventListener('mapLoaded', function (contentAggregate) {
		if (elements.prop('title')) {
			elements.prop('title', contentAggregate.title);
		}
	});
	mapController.addEventListener('mapSaved', function (id, contentAggregate) {
		if (elements.prop('title')) {
			elements.prop('title', contentAggregate.title);
		}
	});
};
