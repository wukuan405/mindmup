/*global jQuery, _*/
jQuery.fn.iosBackgroundColorWidget = function (mapModel, colors, source) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				palette = element.find('[data-mm-role="ios-color-palette"]'),
				template = element.find('[data-mm-role="ios-color-selector-template"]').detach(),
				contentContainer = element.find('[data-mm-role="ios-modal-content"]');
		source = source || 'ios';
		element.on('hide', function () {
			contentContainer.scrollTop(0);
			return true;
		});
		_.each(colors, function (color) {
			var colorSelector = template.clone(),
					colorHash = color === 'transparent' ? '' : '#' + color,
					tansparentImage = element.find('[data-mm-role="transparent-color-image"]').attr('src');
			if (color === 'transparent') {
				colorSelector.css({'background-image': 'url(' + tansparentImage + ')', 'background-size': '100% 100%'});
			}
			colorSelector.css('background-color', colorHash);
			colorSelector.appendTo(palette).show().click(function () {
				mapModel.updateStyle(source, 'background', colorHash);
				element.hideModal();
			});
		});
	});
};