/*global MM*/

MM.ActiveContentListener = function (mapController, onActiveContentChanged)  {
	'use strict';
	var self = this,
		activeContent,
		onChanged = function () {
			onActiveContentChanged(activeContent);
		},
		onMapLoaded = function (newMapId, content) {
			if (activeContent) {
				activeContent.removeEventListener('changed', onChanged);
			}
			activeContent = content;
			onActiveContentChanged(activeContent);
			activeContent.addEventListener('changed', onChanged);
		};
	mapController.addEventListener('mapLoaded', onMapLoaded);
	self.getActiveContent = function () {
		return activeContent;
	};
};