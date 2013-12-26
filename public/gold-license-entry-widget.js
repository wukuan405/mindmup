/*global jQuery, console*/
jQuery.fn.goldLicenseEntryWidget = function (licenseManager, goldApi, activityLog) {
	'use strict';
	var self = this,
		openFromLicenseManager = false,
		hasAction = false,
		remove = self.find('[data-mm-role~=remove]'),
		fileInput = self.find('input[type=file]'),
		uploadButton = self.find('[data-mm-role=upload]'),
		audit = function (action, label) {
			if (label) {
				activityLog.log('Gold', action, label);
			} else {
				activityLog.log('Gold', action);
			}
		},
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
			audit('license-set');
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
			audit('license-section', sectionName);
			self.find('[data-mm-section]').not('[data-mm-section~=' + sectionName + ']').hide();
			self.find('[data-mm-section~=' + sectionName + ']').show();
			setFileUploadButton();
		},
		initialSection = function (hasLicense, wasEntryRequired) {
			if (wasEntryRequired) {
				return hasLicense ? 'unauthorised-license' : 'license-required';
			}
			return hasLicense ? 'view-license' : 'no-license';
		},
		regSuccess = function (apiResponse) {
			/*jshint sub: true*/
			self.find('[data-mm-role=license-capacity]').text(apiResponse['capacity']);
			self.find('[data-mm-role=license-grace-period]').text(apiResponse['grace-period']);
			self.find('[data-mm-role=license-expiry]').text(new Date(parseInt(apiResponse['expiry']) * 1000).toDateString());
			self.find('[data-mm-role=license-email]').text(apiResponse['email']);
			self.find('[data-mm-role=license-payment-url]').attr('href', apiResponse['payment-url']);
			showSection('registration-success');
		},
		regFail = function (apiReason) {
			self.find('[data-mm-section=registration-fail] .alert [data-mm-role]').hide();
			var message = self.find('[data-mm-section=registration-fail] .alert [data-mm-role~=' + apiReason + ']');
			if (message.length > 0) {
				message.show();
			} else {
				self.find('[data-mm-section=registration-fail] .alert [data-mm-role~=network-error]').show();
			}

			showSection('registration-fail');
		},
		register = function () {
			var registrationForm = self.find('[data-mm-section=register] form'),
				emailField = registrationForm.find('input[name=email]'),
				accountNameField = registrationForm.find('input[name=account-name]'),
				termsField = registrationForm.find('input[name=terms]');
			if (!/@/.test(emailField.val())) {
				emailField.parents('div.control-group').addClass('error');
			} else {
				emailField.parents('div.control-group').removeClass('error');
			}
			if (!/[a-z][a-z0-9]{3,20}/.test(accountNameField.val())) {
				accountNameField.parents('div.control-group').addClass('error');
			} else {
				accountNameField.parents('div.control-group').removeClass('error');
			}
			if (!termsField.prop('checked')) {
				termsField.parents('div.control-group').addClass('error');
			} else {
				termsField.parents('div.control-group').removeClass('error');
			}
			if (registrationForm.find('div.control-group').hasClass('error')) {
				return false;
			}
			goldApi.register(accountNameField.val(), emailField.val()).then(regSuccess, regFail);
			showSection('registration-progress');
		};
	self.find('form').submit(function () {return false; });
	self.on('show', function () {
		audit('license-show');
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
	self.find('button[data-mm-role~=register]').click(register);
	licenseManager.addEventListener('license-entry-required', function () {
		openFromLicenseManager = true;
		self.modal('show');
	});
	self.modal({keyboard: true, show: false});
	fileInput.css('opacity', 0).hide();
	/*jshint camelcase: false*/
	fileInput.file_reader_upload(undefined, setLicense, function () {console.log('fail', arguments); showSection('invalid-license'); }, ['txt']);
	self.find('a').click(function () { audit('license-click', this.href); });
	self.find('button').click(function () { audit('license-click', jQuery(this).text()); });
	return self;
};

