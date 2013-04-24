/*global MM, observable*/
MM.AutoSave = function (mapRepository, storage) {
	'use strict';
	var prefix = 'auto-save-',
		self = this,
		events = [],
		checkForLocalChanges = function (mapId) {
			storage.getItem(prefix + mapId).done(function (value) {
				if (value) {
					self.dispatchEvent('unsavedChangesAvailable', mapId);
				}
			});
		},
		trackChanges = function (idea, mapId) {
			idea.addEventListener('changed', function (command, params) {
				events.push({cmd: command, args: params});
				storage.setItem(prefix + mapId, events);
			});
		};
	observable(this);
	mapRepository.addEventListener('mapLoaded', function (idea, mapId) {
		checkForLocalChanges(mapId);
		trackChanges(idea, mapId);
	});
};
