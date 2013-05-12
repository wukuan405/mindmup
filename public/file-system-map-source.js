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
	this.saveMap = function (map, mapId, showAuth) {
		var deferred = jQuery.Deferred(),
			contentToSave = JSON.stringify(map),
			fileName = map.title + '.mup';
		fileSystem.saveMap(contentToSave, mapId, fileName, !!showAuth).then(deferred.resolve, deferred.reject, deferred.notify);
		return deferred.promise();
	};
	this.description = fileSystem.description;
	this.recognises = fileSystem.recognises;
};
