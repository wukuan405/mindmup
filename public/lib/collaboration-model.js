/*global MM, _, observable */
MM.CollaborationModel = function (mapModel) {
	'use strict';
	var self = observable(this),
			running = false,
			onSelectionChanged = function (id, isSelected) {
				if (running && isSelected) {
					self.dispatchEvent('myFocusChanged', id);
				}
			},
			onNodeTitleChanged = function (updatedNode, contentSessionId) {
				if (!contentSessionId) {
					return;
				}
				var collaboratorDidEdit = function (collaborator) {
					if (collaborator && running) {
						self.dispatchEvent('collaboratorDidEdit', 'titleChanged', collaborator, updatedNode);
					}
				};
				self.dispatchEvent('collaboratorRequestedForContentSession', contentSessionId, collaboratorDidEdit);
			};
	self.collaboratorFocusChanged = function (collaborator) {
		if (running) {
			self.dispatchEvent('collaboratorFocusChanged', collaborator);
		}
	};
	self.collaboratorDidEdit = function (collaborator, nodeId) {
		if (running) {
			self.dispatchEvent('collaboratorDidEdit', collaborator, nodeId);
		}
	};
	self.collaboratorPresenceChanged = function (collaborator, isOnline) {
		if (running) {
			var eventName = isOnline ? 'collaboratorJoined' : 'collaboratorLeft';
			self.dispatchEvent(eventName, collaborator, isOnline);
		}
	};
	self.start = function (collaborators) {
		running = true;
		if (_.size(collaborators) > 0) {
			_.each(collaborators, self.collaboratorFocusChanged);
		}

	};
	self.showCollaborator = function (collaborator) {
		// option 1: cache state from collaboratorFocusChanged
		// option 3: throw event with callback for google to handle
		self.dispatchEvent('sessionFocusRequested', collaborator.sessionId, mapModel.centerOnNode);
	};
	self.stop = function () {
		self.dispatchEvent('stopped');
		running = false;
	};
	mapModel.addEventListener('nodeSelectionChanged', onSelectionChanged);
	mapModel.addEventListener('nodeTitleChanged', onNodeTitleChanged);
};
MM.CollaboratorAlerts = function (alert, collaborationModel) {
	'use strict';
	var	prevAlert,
			showUpdate = function (caption, text) {
				if (prevAlert) {
					alert.hide(prevAlert);
				}
				prevAlert = alert.show(caption, text, 'flash');
			};
	collaborationModel.addEventListener('collaboratorJoined', function (collaborator) {
		showUpdate('Collaborator joined:', collaborator.name + ' joined this session');
	});
	collaborationModel.addEventListener('collaboratorLeft', function (collaborator) {
		showUpdate('Collaborator left:', collaborator.name + ' left this session');
	});
};
