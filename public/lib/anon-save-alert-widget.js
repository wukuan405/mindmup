/*global jQuery*/
jQuery.fn.anonSaveAlertWidget = function (alertController, mapController, mapSource, propertyStorage, propertyName) {
	'use strict';
	var template = this.detach(),
		currentAlertId,
		enabled = function () {
			return ! propertyStorage.getItem(propertyName);
		},
		hideAlert = function () {
			if (currentAlertId) {
				alertController.hide(currentAlertId);
				currentAlertId = undefined;
			}
		};
	mapController.addEventListener('mapSaving mapLoaded', hideAlert);
	mapController.addEventListener('mapSaved', function (mapId) {
		var hideAndDisable = function () {
				hideAlert();
				propertyStorage.setItem(propertyName, true);
			},
			clone;
		if (enabled() && mapSource.recognises(mapId)) {
			clone = template.clone();
			clone.find('input').click(hideAndDisable);
			currentAlertId = alertController.show(clone, '', 'success');
		}
	});
};
