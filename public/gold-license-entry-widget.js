/*global jQuery*/
jQuery.fn.goldLicenseEntryWidget = function (licenseManager, activityLog) {
	'use strict';
	var self = this,
		closeReason,
		input = self.find('textarea'),
		controlGroup = self.find('.control-group'),
		commit = self.find('[data-mm-role=commit]'),
		remove = self.find('[data-mm-role=remove]');
	self.on('show', function () {
		activityLog.log('Gold', 'license-show');
		controlGroup.removeClass('error');
		input.val('');
		closeReason = undefined;
	});
	self.on('shown', function () {
		var existing = licenseManager.getLicense();
		input.val(existing && JSON.stringify(existing));
		input.focus();
	});
	self.on('hidden', function () {
		if (closeReason === 'removeLicense') {
			licenseManager.removeLicense();
		} else if (!closeReason) {
			licenseManager.cancelLicenseEntry();
		} else {
			licenseManager.storeLicense(closeReason);
		}
		remove.show();
		self.find('[data-mm-role=invalid-license]').hide();
		self.find('[data-mm-role=no-license]').show();
	});
	self.find('form').submit(function () {
		commit.click();
		return false;
	});
	remove.click(function () {
		closeReason = 'removeLicense';
	});
	commit.click(function () {
		activityLog.log('Gold', 'license-set');
		var licenseText = input.val(), license;
		if (!licenseText) {
			controlGroup.addClass('error');
			return false;
		}
		try {
			license = JSON.parse(licenseText);
		} catch (e) {
			controlGroup.addClass('error');
			return false;
		}
		closeReason = license;
		self.modal('hide');
	});
	licenseManager.addEventListener('license-entry-required', function () {
		var existing = licenseManager.getLicense();
		if (existing) {
			self.find('[data-mm-role=invalid-license]').show();
			self.find('[data-mm-role=no-license]').hide();
		}
		remove.hide();
		self.modal('show');
	});
	self.find('[data-mm-role=invalid-license]').hide();
	return self;
};

