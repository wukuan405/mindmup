/*global MM, jQuery, window*/

MM.IOS = MM.IOS || {};
MM.IOS.WindowProxy = function (mapModel, hidePopoverElements, viewUpdateDelay) {
	'use strict';
	var self = this,
		centerMapModel = function () {
			if (mapModel && mapModel.centerOnNode && mapModel.getSelectedNodeId()) {
				mapModel.centerOnNode(mapModel.getSelectedNodeId());
			}
		},
		setViewport  = function (command) {
			var currentViewPort = jQuery('meta[name=viewport]').attr('content');
			if (currentViewPort === command.args) {
				return;
			}
			jQuery('meta[name=viewport]').attr('content', command.args);
			jQuery('[data-mm-role="ios-context-menu"]').add(jQuery('[data-mm-role="ios-link-editor"]')).trigger(jQuery.Event('hidePopover'));
			if (viewUpdateDelay > 0) {
				window.setTimeout(centerMapModel, viewUpdateDelay);
			} else {
				centerMapModel();
			}


		};
	viewUpdateDelay = viewUpdateDelay || 100;
	self.handlesCommand = function (command) {
		if (command.type === 'setViewport') {
			return true;
		}
		return false;
	};

	self.handleCommand = function (command) {
		if (!self.handlesCommand(command)) {
			return false;
		}
		setViewport(command);
	};
};
