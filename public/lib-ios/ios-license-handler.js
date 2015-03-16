/*global MM*/

MM.IOS.LicenseCommandHandler = function (licenseManager) {
	'use strict';
	var self = this;
	self.handlesCommand = function (command) {
		return command && command.type && command.type == 'license:set';
	};
	self.handleCommand = function (command) {
		var license = command && command.args && command.args[0];
		if (license) {
			licenseManager.storeLicense(license);
		} else {
			licenseManager.removeLicense();
		}
	};
};
