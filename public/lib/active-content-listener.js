/*global MM*/

MM.ActiveContentListener = function (mapController, onActiveContentChanged)  {
	'use strict';
	var self = this,
		activeContent,
		onChanged = function (isNewContent) {
			onActiveContentChanged(activeContent, !!isNewContent);
		},
		onMapLoaded = function (newMapId, content) {
			if (activeContent) {
				activeContent.removeEventListener('changed', onChanged);
			}
			activeContent = content;
			onActiveContentChanged(activeContent, true);
			activeContent.addEventListener('changed', onChanged);
		};
	mapController.addEventListener('mapLoaded', onMapLoaded);
	self.getActiveContent = function () {
		return activeContent;
	};
};