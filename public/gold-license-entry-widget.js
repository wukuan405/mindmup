/*global jQuery*/
jQuery.fn.goldLicenseEntryWidget = function (licenseManager, activityLog) {
	'use strict';
	var self = this,
		input = self.find('textarea'),
		controlGroup = self.find('.control-group'),
		commit = self.find('[data-mm-role=commit]'),
		remove = self.find('[data-mm-role=remove]');
	self.on('show', function () {
		activityLog.log('Gold', 'license-show');
		controlGroup.removeClass('error');
		input.val('');
	});
	self.on('shown', function () {
		var existing = licenseManager.getLicense();
		input.val(existing && JSON.stringify(existing));
		input.focus();
	});
	self.on('hidden', function () {
		licenseManager.cancelLicenseEntry();
		remove.show();
	});
	self.find('form').submit(function () {
		commit.click();
		return false;
	});
	remove.click(function () {
		licenseManager.removeLicense();
	});
	commit.click(function () {
		activityLog.log('Gold', 'license-set');
		var licenseText = input.val();
		if (!licenseText) {
			controlGroup.addClass('error');
			return false;
		}
		try {
			licenseManager.storeLicense(JSON.parse(licenseText));
		} catch (e) {
			controlGroup.addClass('error');
			return false;
		}
		self.modal('hide');
	});
	licenseManager.addEventListener('license-entry-required', function () {
		remove.hide();
		self.modal('show');
	});
	return self;
};

