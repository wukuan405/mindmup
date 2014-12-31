/*global MM, _, observable */
MM.CollaborationModel = function(mapModel) {
	'use strict';
	var self = observable(this),
			api,
			onSelectionChanged = function (id, isSelected) {
				if (api && isSelected) {
					api.notifyFocusChanged(id);
				}
			};
	self.connectTo = function (remoteApi) {
		api = remoteApi;
		_.each(remoteApi.getCollaborators(), function (collaborator) {
			self.dispatchEvent('collaboratorFocusChanged', collaborator);
		});
	};
	self.disconnect = function () {
		api = undefined;
		self.dispatchEvent('disconnected');
	};
	mapModel.addEventListener('nodeSelectionChanged', onSelectionChanged);
};
