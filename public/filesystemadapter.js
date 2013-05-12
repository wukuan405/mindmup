/*global MM, MAPJS, jQuery*/
MM.FileSystemMapSource = function FileSystemMapSource(fileSystem) {
	'use strict';
	var self = this,
		jsonMimeType = 'application/json',
		stringToContent = function (fileContent, mimeType) {
			var json;
			if (mimeType === jsonMimeType) {
				json = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
			} else if (mimeType === 'application/octet-stream') {
				json = JSON.parse(fileContent);
			} else if (mimeType === 'application/x-freemind' || mimeType === 'application/vnd-freemind') {
				json = MM.freemindImport(fileContent);
			}
			return MAPJS.content(json);
		};
	this.loadMap = function loadMap(mapId, showAuth) {
		var deferred = jQuery.Deferred();
		fileSystem.loadMap(mapId, showAuth).then(
			function fileLoaded(stringContent, fileId, mimeType, allowUpdate) {
				deferred.resolve(stringToContent(stringContent, mimeType), fileId, fileSystem.notSharable, allowUpdate);
			},
			deferred.reject,
			deferred.notify
		);
		return deferred.promise();
	};
	this.saveMap = fileSystem.saveMap;
	this.description = fileSystem.description;
	this.recognises = fileSystem.recognises;
};
MM.RetriableMapSourceDecorator = function (adapter) {
	'use strict';
	var	shouldRetry = function (retries) {
			var times = MM.retryTimes(retries);
			return function (status) {
				return times() && status === 'network-error';
			};
		};
	this.loadMap = function (mapId, showAuth) {
		return MM.retry(
			adapter.loadMap.bind(adapter, mapId, showAuth),
			shouldRetry(5),
			MM.linearBackoff()
		);
	};
	this.saveMap = function (contentToSave, mapId, fileName) {
		return MM.retry(
			adapter.saveMap.bind(adapter, contentToSave, mapId, fileName),
			shouldRetry(5),
			MM.linearBackoff()
		);
	};
	this.description = adapter.description;
	this.recognises = adapter.recognises;
};
