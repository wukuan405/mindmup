/*global MM, MAPJS, jQuery*/
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
