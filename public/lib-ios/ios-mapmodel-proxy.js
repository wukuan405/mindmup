/*global MM*/

MM.IOS = MM.IOS || {};
MM.IOS.MapModelProxy = function (mapModel, mmProxy, mapOptions) {
	'use strict';
	var self = this;

	self.canHandleCommand = function (command) {
		if (command && command.type && command.type.substr && command.type.substr(0, 9) === 'mapModel:') {
			var modelCommand = self.mapModelCommandName(command);
			if (mapModel[modelCommand]) {
				return modelCommand;
			}
		}
		return false;
	};
	self.mapModelCommandName = function (command) {
		var components =  command && command.type && command.type.split && command.type.split(':');
		if (components && components.length === 2) {
			return components[1];
		}
		return false;
	};
	self.sendCommandToMapModel = function (command) {
		var modelCommand = self.canHandleCommand(command);
		if (modelCommand) {
			return mapModel[modelCommand].apply(mapModel, command.args);
		}
		return false;
	};
	mapModel.addEventListener('nodeEditRequested', function (nodeId, shouldSelectAll, editingNew) {
		if (!mapOptions || !mapOptions.inlineEditingDisabled) {
			return;
		}
		var node = mapModel.findIdeaById(nodeId),
				title = node && node.title;
		mmProxy.sendMessage({'type': 'nodeEditRequested', 'args': {'nodeId': nodeId, 'title': title, 'shouldSelectAll': shouldSelectAll, 'editingNew': editingNew}});
	});
};