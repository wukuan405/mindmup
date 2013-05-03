/*global jQuery*/
jQuery.fn.titleUpdateWidget = function (mapRepository) {
	'use strict';
	var elements = this;
	mapRepository.addEventListener('mapLoaded', function (contentAggregate) {
		if (elements.prop('title')) {
			elements.prop('title', contentAggregate.title);
		}
	});
};
