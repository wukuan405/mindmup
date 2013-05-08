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
		hashMapId = function (mapId) {
			return 'm:' + mapId;
		},
		knownMapId = getMapIdFromHash(),
		confirmationRequired = false;
	self.confirmationRequired = function (val) {
		if (val === undefined) {
			return confirmationRequired;
		}
		confirmationRequired = val ? true : false;
		return confirmationRequired;
	};
	self.sharingUrl = function () {
		return baseUrl + 'map/' + self.currentMapId();
	};
	self.hashMapId = hashMapId;
	self.currentMapId = function () {
		return getMapIdFromHash() || (storage && storage.getItem && storage.getItem('mostRecentMapLoaded')) || 'default';
	};
	self.wireLinkForMapId = function (newMapId, link) {
		link.attr('href', '#' + hashMapId(newMapId));
		return link;
	};
	self.changeMapId = function (newMapId, force) {
		if (newMapId && knownMapId && newMapId === knownMapId) {
			return false;
		}
		if (confirmationRequired && !force) {
			self.dispatchEvent('mapIdChangeConfirmationRequired', newMapId);
		} else {
			knownMapId = newMapId;
			window.location.hash = hashMapId(newMapId);
			self.dispatchEvent('mapIdChanged', newMapId);
			storage.setItem('mostRecentMapLoaded', newMapId);
		}
		return true;
	};
	window.addEventListener('hashchange', function () {
		var newMapId = getMapIdFromHash();
		if (!newMapId) {
			if (knownMapId) {
				window.location.hash = hashMapId(knownMapId);
			}
			return false;
		}
		if (!knownMapId || knownMapId !== newMapId) {
			self.changeMapId(newMapId);
		}
	});
	return self;
};