/*global jQuery, _*/
jQuery.fn.iosBackgroundColorWidget = function (mapModel, colors) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				palette = element.find('[data-mm-role="ios-color-palette"]'),
				template = element.find('[data-mm-role="ios-color-selector-template"]').detach();

		_.each(colors, function (color) {
			var colorSelector = template.clone(),
					colorHash = '#' + color;
			colorSelector.css('background-color', colorHash);
			colorSelector.appendTo(palette).show().click(function () {
				mapModel.updateStyle('ios', 'background', colorHash);
				element.hide();
			});
		});
	});
};