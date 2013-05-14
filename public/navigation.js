/*global MM, window*/
MM.navigation = function (storage, baseUrl, mapController) {
	'use strict';
	var self = this,
		unknownMapId = 'nil',
		mapIdRegEx = /[Mm]:([^,;#]*)/,
		getMapIdFromHash = function () {
			var windowHash = window && window.location && window.location.hash,
				found = windowHash && mapIdRegEx.exec(windowHash);
			return found && found[1];
		},
		setMapIdInHash = function (mapId) {
			if (mapIdRegEx.test(window.location.hash)) {
				window.location.hash = window.location.hash.replace(mapIdRegEx, 'm:' + mapId);
			} else if (window.location.hash && window.location.hash !== '#') {
				window.location.hash = window.location.hash + ',m:' + mapId;
			} else {
				window.location.hash = 'm:' + mapId;
			}
		},
		changeMapId = function (newMapId) {
			if (newMapId) {
				storage.setItem('mostRecentMapLoaded', newMapId);
			}
			newMapId = newMapId || unknownMapId;
			setMapIdInHash(newMapId);
			return true;
		};
	self.sharingUrl = function () {
		return mapController.isMapSharable() &&  baseUrl + 'map/' + mapController.currentMapId();
	};
	self.loadInitial = function () {
		var initialMapId = getMapIdFromHash();
		if (!initialMapId || initialMapId === unknownMapId) {
			initialMapId = (storage && storage.getItem && storage.getItem('mostRecentMapLoaded')) || 'default';
		}
		mapController.loadMap(initialMapId);
	};
	mapController.addEventListener('mapLoaded', function (idea, newMapId) {
		changeMapId(newMapId, true);
	});
	mapController.addEventListener('mapSaved', function (newMapId) {
		changeMapId(newMapId, true);
	});
	self.hashChange = function () {
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
	};
	window.addEventListener('hashchange', self.hashChange);
	return self;
};
