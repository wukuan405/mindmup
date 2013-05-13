/*global MM*/
MM.navigation = function (storage, baseUrl, mapController) {
	'use strict';
	var self = this,
		unknownMapId = 'nil',
		getMapIdFromHash = function () {
			var windowHash = window && window.location && window.location.hash,
				found = windowHash && mapIdRegEx.exec(windowHash);
			return found && found[1] !== unknownMapId && found[1];
		},
		mapIdRegEx = /[Mm]:([^,;#]*)/,
		changeMapId = function (newMapId) {
			if (newMapId) {
				storage.setItem('mostRecentMapLoaded', newMapId);
			}
			newMapId = newMapId || unknownMapId;
			window.location.hash = 'm:' + newMapId;
			return true;
		};
	self.sharingUrl = function () {
		return mapController.isAdapterPublic() &&  baseUrl + 'map/' + mapController.currentMapId();
	};
	self.loadInitial = function () {
		var initialMapId = getMapIdFromHash() || (storage && storage.getItem && storage.getItem('mostRecentMapLoaded')) || 'default';
		mapController.loadMap(initialMapId);
	};
	mapController.addEventListener('mapLoaded', function (idea, newMapId) {
		changeMapId(newMapId, true);
	});
	mapController.addEventListener('mapSaved', function (newMapId) {
		changeMapId(newMapId, true);
	});

	window.addEventListener('hashchange', function () {
		var newMapId = getMapIdFromHash();
		if (newMapId === unknownMapId) {
			return;
		}
		if (!newMapId) {
			changeMapId(mapController.currentMapId());
			return false;
		} else {
			mapController.loadMap(newMapId);
			return true;
		}
	});

	return self;
};
