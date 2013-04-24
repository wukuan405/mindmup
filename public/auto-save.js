/*global MM, observable*/
MM.AutoSave = function (mapRepository, storage) {
	'use strict';
	var prefix = 'auto-save-',
		self = this,
    currentMapId,
    currentIdea,
		checkForLocalChanges = function (mapId) {
			storage.getItem(prefix + mapId).done(function (value) {
				if (value) {
					self.dispatchEvent('unsavedChangesAvailable', mapId);
          self.applyUnsavedChanges();
				}
			});
		},
		trackChanges = function (idea, mapId) {
      var events = [];
			idea.addEventListener('changed', function (command, params) {
				events.push({cmd: command, args: params});
				storage.setItem(prefix + mapId, events);
			});
		};
	observable(this);
  
  self.applyUnsavedChanges = function () {
    storage.getItem(prefix + currentMapId).done(function (events) {
      if (events) {
        events.forEach(function (event) {
          currentIdea[event.cmd].apply(currentIdea, event.args); 
        });
      }
		});
  };
  self.discardUnsavedChanges = function () {
    storage.remove(prefix + currentMapId);
  };
	mapRepository.addEventListener('mapLoaded', function (idea, mapId) {
    currentMapId = mapId;
    currentIdea = idea;
		checkForLocalChanges(mapId);
		trackChanges(idea, mapId);
	});
};
