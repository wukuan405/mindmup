/*global MM, jQuery, MAPJS, window */
MM.Extensions.oldCanvas = function () {
	'use strict';
	jQuery.fn.domMapWidget = jQuery.fn.mapWidget;
	MM.Extensions.mmConfig.layout = 'kinetic';
	MM.Extensions.components.mapModel.setLayoutCalculator(MAPJS.KineticMediator.layoutCalculator);
	jQuery.fn.mapWidget = jQuery.fn.domMapWidget;
	MAPJS.defaultStyles = {
		root: {background: '#22AAE0'},
		nonRoot: {background: '#E0E0E0'}
	};
};
if (!window.jasmine) {
	MM.Extensions.oldCanvas();
}
