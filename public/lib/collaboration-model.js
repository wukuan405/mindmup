/*global MM, _, observable */
MM.CollaborationModel = function(mapModel) {
	'use strict';
	var self = observable(this),
			followingSessionId,
			running = false,
			onSelectionChanged = function (id, isSelected) {
				if (running && isSelected) {
					self.dispatchEvent('myFocusChanged', id);
				}
			};
	self.collaboratorFocusChanged = function (collaborator) {
		if (running) {
			self.dispatchEvent('collaboratorFocusChanged', collaborator);
			if (collaborator.sessionId === followingSessionId) {
				mapModel.selectNode(collaborator.focusNodeId);
			}
		}
	};
	self.collaboratorPresenceChanged = function (collaborator, isOnline) {
		if (running) {
			self.dispatchEvent('collaboratorPresenceChanged', collaborator, isOnline);
		}

	};
	self.start = function (collaborators) {
		running = true;
		followingSessionId = undefined;
		if (_.size(collaborators)> 0) {
			_.each(collaborators, self.collaboratorFocusChanged);
		}

	};
	self.stop = function () {
		self.dispatchEvent('stopped');
		running = false;
	};
	self.toggleFollow = function(sessionId) {
		if (followingSessionId === sessionId) {
			followingSessionId = undefined;
		} else {
			followingSessionId = sessionId;
		}
	};
	mapModel.addEventListener('nodeSelectionChanged', onSelectionChanged);
};
