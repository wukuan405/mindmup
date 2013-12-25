/*global jQuery, console*/
jQuery.fn.goldLicenseEntryWidget = function (licenseManager, activityLog) {
	'use strict';
	var self = this,
		openFromLicenseManager = false,
		hasAction = false,
		remove = self.find('[data-mm-role~=remove]'),
		fileInput = self.find('input[type=file]'),
		uploadButton = self.find('[data-mm-role=upload]'),
		fillInFields = function () {
			var license = licenseManager.getLicense(),
				expiryDate = license && license.expiry &&  new Date(parseInt(license.expiry) * 1000);
			
			self.find('input[data-mm-role~=account-name]').val((license && license.account) || '');
			self.find('input[data-mm-role~=expiry-date]').val((expiryDate && expiryDate.toDateString()) || '');
			if (expiryDate && expiryDate < new Date()) {
				self.find('[data-mm-role~=expired]').show();
			} else {
				self.find('[data-mm-role~=expired]').hide();
			}
		},
		setLicense = function (licenseText) {
			activityLog.log('Gold', 'license-set');
			if (licenseManager.storeLicense(licenseText)) {
				hasAction = true;
				if (openFromLicenseManager) {
					self.modal('hide');
				} else {
					fillInFields();
					showSection('view-license');
				}
			} else {
				showSection('invalid-license');
			}
		},
		setFileUploadButton = function () {
			var firstVisibleUpload = uploadButton.filter(':visible').first();
			if (firstVisibleUpload.length > 0) {
				fileInput.show().css('opacity', 0).css('position', 'absolute').offset(firstVisibleUpload.offset()).width(firstVisibleUpload.outerWidth())
					.height(firstVisibleUpload.outerHeight());
			} else {
				fileInput.hide();
			}
		},
		showSection = function (sectionName) {
			self.find('[data-mm-section]').not('[data-mm-section~=' + sectionName + ']').hide();
			self.find('[data-mm-section~=' + sectionName + ']').show();
			setFileUploadButton();
		},
		initialSection = function (hasLicense, wasEntryRequired) {
			if (wasEntryRequired) {
				return hasLicense ? 'unauthorised-license' : 'license-required';
			}
			return hasLicense ? 'view-license' : 'no-license';
		};
	self.find('form').submit(function () {return false; });
	self.on('show', function () {
		activityLog.log('Gold', 'license-show');
		hasAction = false;
		var license = licenseManager.getLicense();
		showSection(initialSection(license, openFromLicenseManager));
		fillInFields(license);
	});
	self.on('shown', setFileUploadButton);


	self.on('hidden', function () {
		if (!hasAction) {
			licenseManager.cancelLicenseEntry();
		}
		remove.show();
		openFromLicenseManager = false;
	});
	remove.click(function () {
		licenseManager.removeLicense();
		hasAction = true;
		fillInFields();
		showSection('no-license');
	});
	self.find('button[data-mm-role~=show-section]').click(function () {
		showSection(jQuery(this).data('mm-target-section'));
	});
	licenseManager.addEventListener('license-entry-required', function () {
		openFromLicenseManager = true;
		self.modal('show');
	});
	self.modal({keyboard: true, show: false});
	fileInput.css('opacity', 0).hide();
	fileInput.file_reader_upload(undefined, setLicense, function () {console.log('fail', arguments); showSection('invalid-license'); }, ['txt']);
	return self;
};

