/*global MM, observable*/
MM.AutoSave = function (mapController, storage, alertDispatcher, mapModel) {
	'use strict';
	var prefix = 'auto-save-',
		self = this,
		currentMapId,
		currentIdea,
		changeListener,
		resourceListener,
		events = [],
		isWarningShown = false,
		checkForLocalChanges = function (mapId) {
			var value = storage.getItem(prefix + mapId);
			if (value) {
				self.dispatchEvent('unsavedChangesAvailable', mapId);
			}
		},
		pushEvent = function (eventObject, mapId) {
			events.push(eventObject);
			try {
				storage.setItem(prefix + mapId, events);
			} catch (e) {
				if (!isWarningShown) {
					isWarningShown = true;
					alertDispatcher.show('Problem with auto save!', 'We could not autosave the changes - there is not enough free space in your local browser repository.', 'warning');
				}
			}
		},
		trackChanges = function (idea, mapId) {
			events = [];
			changeListener = function (command, params) {
				pushEvent({cmd: command, args: params}, mapId);
			};
			resourceListener = function (resourceBody, resourceId) {
				pushEvent({cmd: 'storeResource', args: [resourceBody, resourceId]}, mapId);
			};
			idea.addEventListener('changed', changeListener);
			idea.addEventListener('resourceStored', resourceListener);
		},
		onTrackingChange = function (mapId, idea, properties) {
			if (changeListener && currentIdea) {
				currentIdea.removeEventListener('changed', changeListener);
				currentIdea.removeEventListener('resourceStored', resourceListener);
			}

			if (mapId && (!properties || !properties.autoSave)) {
				currentMapId = mapId;
				currentIdea = idea;
				isWarningShown = false;
				checkForLocalChanges(mapId);
				trackChanges(idea, mapId);
			}
		};
	observable(this);
	self.applyUnsavedChanges = function () {
		var events = storage.getItem(prefix + currentMapId);
		if (events) {
			mapModel.pause();
			events.forEach(function (event) {
				currentIdea.execCommand(event.cmd, event.args);
			});
			mapModel.resume();
		}
	};
	self.discardUnsavedChanges = function () {
		events = [];
		storage.remove(prefix + currentMapId);
	};
	mapController.addEventListener('mapSaved', function (mapId, idea) {
		isWarningShown = false;
		if (mapId === currentMapId || idea === currentIdea) {
			self.discardUnsavedChanges();
		}
		if (mapId !== currentMapId) {
			onTrackingChange(mapId, idea);
		}
	});
	mapController.addEventListener('mapLoaded', onTrackingChange);
};
