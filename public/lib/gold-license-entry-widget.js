/*global jQuery, window, _*/
jQuery.fn.goldLicenseEntryWidget = function (licenseManager, goldApi, activityLog, messageTarget) {
	'use strict';
	messageTarget = messageTarget || window;
	var self = this,
		openFromLicenseManager = false,
		remove = self.find('[data-mm-role~=remove]'),
		currentSection,
		audit = function (action, label) {
			if (label) {
				activityLog.log('Gold', action, label);
			} else {
				activityLog.log('Gold', action);
			}
		},
		displaySubscription = function (subscription, sectionName) {
			var expiryTs = subscription && subscription.expiry,
				expiryDate = new Date(expiryTs * 1000),
				renewalDescription = (expiryDate && expiryDate.toDateString()) || '',
				license = licenseManager.getLicense(),
				accountName = (license && license.account) || '';
			showSection(sectionName);
			self.find('[data-mm-role~=account-name]').val(accountName).text(accountName);
			self.find('[data-mm-role~=expiry-date]').val(renewalDescription).text(renewalDescription);
			self.find('[data-mm-role~=subscription-name]').val(subscription.subscription).text(subscription.subscription);
			self.find('[data-mm-role~=renewal-price]').val(subscription.renewalPrice).text(subscription.renewalPrice);
			if (subscription.paymentType) {
				self.find('[data-mm-role~=payment-type-block]').show();
				self.find('[data-mm-role~=payment-type]').text(subscription.paymentType);
			} else {
				self.find('[data-mm-role~=payment-type-block]').hide();
			}
		},
		fillInFields = function () {
			var license = licenseManager.getLicense(),
				failExpiry = function (reason) {
					if (reason ===  'license-purchase-required') {
						showSection('license-purchase-required');
					} else if (currentSection === 'view-license' || currentSection === 'loading-subscription') {
						if (reason === 'not-authenticated') {
							showSection('invalid-license');
						}  else {
							showSection('license-server-unavailable');
						}
					}
				},
				showSubscription = function (subscription) {
					var expiryTs = subscription && subscription.expiry;
					if (expiryTs === -1 || expiryTs === undefined)  {
						failExpiry('license-purchase-required');
					} else if (expiryTs === 0)  {
						failExpiry('not-authenticated');
					} else if (expiryTs < Date.now() / 1000) {
						if (currentSection === 'view-license' || currentSection === 'loading-subscription') {
							showSection('expired-license');
						}
					} else {
						if (subscription.subscription === 'cancelled') {
							displaySubscription(subscription, 'cancelled-subscription');
						} else {
							displaySubscription(subscription, 'view-license');
						}
					}
				},
				accountName = (license && license.account) || '';
			self.find('[data-mm-role~=account-name]').val(accountName).text(accountName);
			if (license) {
				self.find('[data-mm-role~=license-text]').val(JSON.stringify(license));
				if (currentSection === 'view-license') {// || currentSection === 'unauthorised-license') {
					showSection('loading-subscription');
					goldApi.getSubscription().then(showSubscription, failExpiry);
				}
			}  else {
				self.find('[data-mm-role~=license-text]').val('');
				self.find('[data-mm-role~=expiry-date]').val('').text('');
				self.find('[data-mm-role~=subscription-name]').val('').text('');
				self.find('[data-mm-role~=renewal-price]').val('').text('');
			}
		},
		showSection = function (sectionName) {
			currentSection = sectionName;
			audit('license-section', sectionName);
			self.find('[data-mm-section]').not('[data-mm-section~=' + sectionName + ']').hide();
			self.find('[data-mm-section~=' + sectionName + ']').show();
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
			if (apiResponse['license']) {
				self.find('[data-mm-role~=license-text]').val(apiResponse['license']);
			}
			if (apiResponse['grace-period']) {
				self.find('[data-mm-role=license-grace-period]').text(apiResponse['grace-period']);
				self.find('[data-mm-role=license-has-grace-period]').show();
			} else {
				self.find('[data-mm-role=license-has-grace-period]').hide();
			}
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
			if (!/^[a-z][a-z0-9]{3,20}$/.test(accountNameField.val())) {
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
		},
		onWindowMessage = function (windowMessageEvt) {
			if (windowMessageEvt && windowMessageEvt.data && windowMessageEvt.data.goldApi) {
				audit('license-message', windowMessageEvt.data.goldApi);
				goldApi.getSubscription().then(function (subscription) {
					var expiryTs = subscription && subscription.expiry;
					if (expiryTs > Date.now() / 1000) {
						licenseManager.completeLicenseEntry();
						if (currentSection === 'view-license') {
							displaySubscription(subscription, 'view-license');
						} else {
							displaySubscription(subscription, 'payment-complete');
						}

					}
				});
			}
		};
	self.find('form').submit(function () {return this.action; });
	self.find('[data-mm-role~=form-submit]').click(function () {
		var id = jQuery(this).data('mm-form');
		jQuery(id).submit();
	});
	self.on('show', function () {
		audit('license-show');
		var license = licenseManager.getLicense();
		self.find('input[type=text]').val('');
		showSection(initialSection(license, openFromLicenseManager));
		fillInFields();
	});
	self.on('shown', function () {
		if (self.find('[data-mm-role=gold-account-identifier]').is(':visible')) {
			self.find('[data-mm-role=gold-account-identifier]').focus();
		}
	});

	self.on('hidden', function () {
		licenseManager.cancelLicenseEntry();
		remove.show();
		openFromLicenseManager = false;
	});
	remove.click(function () {
		licenseManager.removeLicense();
		fillInFields();
		showSection('no-license');
	});
	self.find('button[data-mm-role~=show-section]').click(function () {
		showSection(jQuery(this).data('mm-target-section'));
	});
	self.find('button[data-mm-role~=register]').click(register);
	self.find('button[data-mm-role~=cancel-subscription]').click(function () {
		showSection('cancelling-subscription');
		goldApi.cancelSubscription().then(
			function () {
				showSection('cancelled-subscription');
			},
			function () {
				showSection('view-license');
			}
		);
	});
	self.find('button[data-mm-role=kickoff-sign-up]').click(function () {
		var entered = self.find('[data-mm-role=gold-account-identifier]').val(),
			isEmail = _.include(entered, '@');
		if (isEmail) {
			self.find('#gold-register-account-name').val('');
			self.find('#gold-register-email').val(entered);
		} else {
			self.find('#gold-register-account-name').val(entered);
			self.find('#gold-register-email').val('');
		}
		showSection('register');
		if (isEmail) {
			self.find('#gold-register-account-name').focus();
		} else {
			self.find('#gold-register-email').focus();
		}
	});
	self.find('[data-mm-role=kickoff-restore-license]').click(function () {
		var identiferField = self.find('[data-mm-role=gold-account-identifier]'),
			entered = identiferField.val();
		if (entered && entered.trim()) {
			identiferField.parents('div.control-group').removeClass('error');
			showSection('sending-code');
			goldApi.requestCode(entered.trim()).then(
				function () {
					showSection('code-sent');
				},
				function () {
					showSection('sending-code-failed');
				}
			);
		} else {
			identiferField.parents('div.control-group').addClass('error');
		}
	});
	self.find('[data-mm-role=restore-license-with-code]').click(function () {
		var codeField = self.find('[data-mm-role=gold-access-code]'),
			code = codeField.val();
		if (code && code.trim()) {
			showSection('sending-restore-license-code');
			goldApi.restoreLicenseWithCode(code.trim()).then(
				function () {
					goldApi.getSubscription().then(function (subscription) {
						var expiryTs = subscription && subscription.expiry;
						if (expiryTs > Date.now() / 1000) {
							licenseManager.completeLicenseEntry();
						}
					});

					showSection('view-license');
					fillInFields();
				},
				function () {
					showSection('restore-code-failed');
				});
		} else {
			codeField.parents('div.control-group').addClass('error');
		}
	});
	licenseManager.addEventListener('license-entry-required', function () {
		openFromLicenseManager = true;
		self.modal('show');
	});
	self.modal({keyboard: true, show: false});
	/*jshint camelcase: false*/
	messageTarget.addEventListener('message', onWindowMessage, false);
	return self;
};

