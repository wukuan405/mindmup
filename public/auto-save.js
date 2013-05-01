/*global MM, observable*/
MM.AutoSave = function (mapRepository, storage, alertDispatcher) {
	'use strict';
	var prefix = 'auto-save-',
		self = this,
		currentMapId,
		currentIdea,
    events = [],
    isWarningShown = false,
		checkForLocalChanges = function (mapId) {
			var value = storage.getItem(prefix + mapId);
			if (value) {
				self.dispatchEvent('unsavedChangesAvailable', mapId);
			}
		},
		trackChanges = function (idea, mapId) {
			events = [];
			idea.addEventListener('changed', function (command, params) {
				events.push({cmd: command, args: params});
				try {
					storage.setItem(prefix + mapId, events);
				} catch (e) {
					if (!isWarningShown) {
						isWarningShown = true;
						alertDispatcher.show('Problem with auto save!', 'We could not autosave the changes - there is not enough free space in your local browser repository.', 'warning');
					}
				}
			});
		};
	observable(this);
	self.applyUnsavedChanges = function () {
		var events = storage.getItem(prefix + currentMapId);
		if (events) {
			events.forEach(function (event) {
				currentIdea[event.cmd].apply(currentIdea, event.args);
			});
		}
	};
	self.discardUnsavedChanges = function () {
		events = [];
		storage.remove(prefix + currentMapId);
	};
	mapRepository.addEventListener('mapSaved', function (mapId, idea) {
		isWarningShown = false;
		if (mapId === currentMapId || idea === currentIdea) {
			self.discardUnsavedChanges();
		}
	});
	mapRepository.addEventListener('mapLoaded', function (idea, mapId) {
		currentMapId = mapId;
		currentIdea = idea;
		isWarningShown = false;
		checkForLocalChanges(mapId);
		trackChanges(idea, mapId);
	});
};
