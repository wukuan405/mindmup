/*global MM, _, observable */
MM.CollaborationModel = function(mapModel) {
	'use strict';
	var self = observable(this),
			followedSessionId,
			running = false,
			onSelectionChanged = function (id, isSelected) {
				if (running && isSelected) {
					self.dispatchEvent('myFocusChanged', id);
				}
			};
	self.collaboratorFocusChanged = function (collaborator) {
		if (running) {
			self.dispatchEvent('collaboratorFocusChanged', collaborator);
			if (collaborator.sessionId === followedSessionId) {
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
		followedSessionId = undefined;
		if (_.size(collaborators)> 0) {
			_.each(collaborators, self.collaboratorFocusChanged);
		}

	};
	self.stop = function () {
		self.dispatchEvent('stopped');
		running = false;
	};
	self.toggleFollow = function(sessionId) {
		if (followedSessionId === sessionId) {
			followedSessionId = undefined;
			self.dispatchEvent('followedCollaboratorChanged', undefined);
		} else {
			followedSessionId = sessionId;
			self.dispatchEvent('followedCollaboratorChanged', sessionId);
		}
	};
	mapModel.addEventListener('nodeSelectionChanged', onSelectionChanged);
};
