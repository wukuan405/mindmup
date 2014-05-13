/*global MM*/

MM.activeContentListener = function (mapController, onActiveContentChanged)  {
	'use strict';
	var activeContent,
		mapId,
		onChanged = function () {
			onActiveContentChanged(mapId, activeContent);
		},
		onMapLoaded = function (newMapId, content) {
			if (activeContent) {
				activeContent.removeEventListener('changed', onChanged);
			}
			mapId = newMapId;
			activeContent = content;
			onActiveContentChanged(mapId, activeContent);
			activeContent.addEventListener('changed', onChanged);
		};
	mapController.addEventListener('mapLoaded', onMapLoaded);
};