/*global jQuery*/
jQuery.fn.embedMapWidget = function (mapController) {
	'use strict';
	var element = this,
		textArea = element.find('textarea'),
		templateText = textArea.val().trim(),
		selectText = function () {
			if (textArea[0].setSelectionRange) {
				textArea[0].setSelectionRange(0, textArea[0].value.length);
			} else {
				textArea[0].select();
			}
			textArea.focus();
			return false;
		};
	element.find('textarea').click(selectText);
	element.on('show', function () {
		element.find('textarea').val(templateText.replace('**mapid**', mapController.currentMapId()));
	});
	element.on('shown', selectText);
	return element;
};
