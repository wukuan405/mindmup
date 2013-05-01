/*global jQuery, MM, observable*/
MM.OfflineAdapter = function (storage) {
	'use strict';
	this.description = 'OFFLINE';
	this.notSharable = true;
	this.recognises = function (mapId) {
		return mapId && mapId[0] === 'o';
	};
	this.loadMap = function (mapId) {
		var result = jQuery.Deferred(),
			map = storage.load(mapId);
		if (map) {
			result.resolve(map, mapId, 'application/json', true);
		} else {
			result.reject('not-found');
		}
		return result.promise();
	};
	this.saveMap = function (contentToSave, mapId) {
		var result = jQuery.Deferred(),
			knownErrors = {
				'QuotaExceededError': 'file-too-large',
				'NS_ERROR_DOM_QUOTA_REACHED': 'file-too-large',
				'QUOTA_EXCEEDED_ERR': 'file-too-large'
			};
		try {
			if (!this.recognises(mapId)) {
				result.resolve(storage.saveNew(contentToSave));
			} else {
				storage.save(mapId, contentToSave);
				result.resolve(mapId);
			}
		} catch (e) {
			var reason = knownErrors[e.name];
			if (reason) {
				result.reject(reason);
			} else {
				result.reject('local-storage-failed', e.toString()).promise();
			}
		}
		return result.promise();
	};
};
MM.OfflineMapStorage = function (storage, keyPrefix) {
	'use strict';
	observable(this);
	keyPrefix = keyPrefix || 'offline';
	var dispatchEvent = this.dispatchEvent,
		keyName = keyPrefix + '-maps';
	var newFileInformation = function (fileDescription) {
			return {d: fileDescription, t: Math.round(+new Date() / 1000)};
		},
		newFileId = function (nextFileNumber) {
			return keyPrefix + '-map-' + nextFileNumber;
		},
		storedFileInformation = function () {
			var files = storage.getItem(keyName) || { nextMapId: 1, maps: {}};
			files.maps = files.maps || {};
			return files;
		},
		store = function (fileId, fileContent, files) {
			files.maps[fileId] = newFileInformation(fileContent.title);
			storage.setItem(fileId, {map: fileContent});
			storage.setItem(keyName, files);
		};
	this.save = function (fileId, fileContent) {
		store(fileId, fileContent, storedFileInformation());
	};
	this.saveNew = function (fileContent) {
		var files = storedFileInformation(),
			fileId = newFileId(files.nextMapId);
		files.nextMapId++;
		store(fileId, fileContent, files);
		return fileId;
	};
	this.remove = function (fileId) {
		var files = storedFileInformation();
		storage.remove(fileId);
		delete files.maps[fileId];
		storage.setItem(keyName, files);
		dispatchEvent('mapDeleted', fileId);
	};
	this.restore = function (fileId, fileContent, fileInfo) {
		var files = storedFileInformation();
		files.maps[fileId] = fileInfo;
		storage.setItem(fileId, {map: fileContent});
		storage.setItem(keyName, files);
		dispatchEvent('mapRestored', fileId, fileContent, fileInfo);
	};
	this.list = function () {
		return storedFileInformation().maps;
	};
	this.load = function (fileId) {
		var item = storage.getItem(fileId);
		return item && item.map;
	};
	return this;
};

MM.OfflineMapStorageBookmarks = function (offlineMapStorage, bookmarks) {
	'use strict';
	offlineMapStorage.addEventListener('mapRestored', function (mapId, map, mapInfo) {
		bookmarks.store({
			mapId: mapId,
			title: mapInfo.d
		});
	});

	offlineMapStorage.addEventListener('mapDeleted', function (mapId) {
		bookmarks.remove(mapId, true);
	});
};
