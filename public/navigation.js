/*global MM, observable*/
MM.navigation = function (storage, baseUrl) {
	'use strict';
	observable(this);
	var self = this,
		mapIdRegEx = /[Mm]:([^,;#]*)/,
		getMapIdFromHash = function () {
			var windowHash = window && window.location && window.location.hash,
				found = windowHash && mapIdRegEx.exec(windowHash);
			return found && found[1];
		},
		knownMapId = getMapIdFromHash();
	self.sharingUrl = function () {
		return baseUrl + 'map/' + self.currentMapId();
	};
	self.hashMapId = function (mapId) {
		return 'm:' + mapId;
	};
	self.currentMapId = function () {
		return getMapIdFromHash() || (storage && storage.getItem && storage.getItem('mostRecentMapLoaded')) || 'default';
	};
	self.changeMapId = function (newMapId) {
		if (newMapId && knownMapId && newMapId === knownMapId) {
			return false;
		}
		knownMapId = newMapId;
		window.location.hash = self.hashMapId(newMapId);
		self.dispatchEvent('mapIdChanged', newMapId);
		storage.setItem('mostRecentMapLoaded', newMapId);
		return true;
	};
	window.addEventListener('hashchange', function () {
		var newMapId = getMapIdFromHash();
		if (!newMapId) {
			if (knownMapId) {
				window.location.hash = self.hashMapId(knownMapId);
			}
			return false;
		}
		if (!knownMapId || knownMapId !== newMapId) {
			self.changeMapId(newMapId);
		}
	});
	return self;
};