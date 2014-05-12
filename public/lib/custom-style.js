/* global jQuery, MM*/
MM.CustomStyleController = function (mapController, mapModel) {
	'use strict';
	var self = this,
		customStyleElement = jQuery('<style id="customStyleCSS" type="text/css"></style>').appendTo('body'),
		activeContent,
		currentStyleText,
		setActiveContent = function (mapId, content) {
			if (activeContent) {
				activeContent.removeEventListener('changed', publishData);
			}
			activeContent = content;
			publishData();
			activeContent.addEventListener('changed', publishData);
		},
		publishData = function () {
			var newText = activeContent.getAttr('customCSS');
			if (newText !== currentStyleText) {
				currentStyleText = newText;
				customStyleElement.text(currentStyleText || '');
				jQuery('.mapjs-node').data('nodeCacheMark', '');
				mapModel.rebuildRequired();
			}
		};
	mapController.addEventListener('mapLoaded', setActiveContent);
	self.getStyle = function () {
		return currentStyleText || '';
	};
	self.setStyle = function (styleText) {
		activeContent.updateAttr(activeContent.id, 'customCSS', styleText);
	};
};
jQuery.fn.customStyleWidget = function (controller) {
	'use strict';
	var modal = this,
		textField = modal.find('[data-mm-role=style-input]'),
		confirmButton = modal.find('[data-mm-role=save]');
	modal.on('show', function () {
		textField.val(controller.getStyle());
	});
	confirmButton.click(function () {
		controller.setStyle(textField.val());
	});
};

