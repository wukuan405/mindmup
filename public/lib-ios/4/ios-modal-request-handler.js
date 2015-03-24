/*global MM, jQuery*/
MM.IOS.ModalRequestHandler = function (modalRoleName) {
	'use strict';
	var self = this;
	self.handlesCommand = function (command) {
		return command && command.type && command.type == 'modal';
	};
	self.handleCommand = function (command) {
		var action = command && command.args && command.args[0],
				modals = jQuery('[data-mm-role~="' + modalRoleName + '"]');
		if (action === 'hide') {
			modals.hideModal();
		} else {
			jQuery('[data-mm-ios-role="' + action + '"]').click();
		}

	};

};
