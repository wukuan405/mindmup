/*global beforeEach, fakeBootstrapModal, describe, jasmine, it, jQuery, observable, expect, afterEach, _, spyOn*/
describe('Gold License Widget', function () {
	'use strict';
	var template = '<div class="modal">' +
					'<span data-mm-section="license-required"></span>' +
					'<span data-mm-section="unauthorised-license"></span>' +
					'<span data-mm-section="invalid-license"></span>' +
					'<span data-mm-section="license-purchase-required"></span>' +
					'<span data-mm-section="expired-license"></span>' +
					'<span data-mm-section="license-server-unavailable"></span>' +
					'<span data-mm-section="no-license"></span>' +
					'<span data-mm-section="view-license"></span>' +
					'<span data-mm-section="loading-subscription"></span>' +
					'<span data-mm-section="cancellation-failed"></span>' +
					'<span data-mm-section="code-sent"></span>' +
					'<span data-mm-section="sending-code"></span>' +
					'<span data-mm-section="sending-code-failed"></span>' +
					'<span data-mm-section="sending-restore-license-code"></span>' +
					'<span data-mm-section="restore-code-failed"></span>' +
					'<span data-mm-section="cancelled-subscription"></span>' +
					'<span data-mm-section="payment-complete"></span>' +
					'<span data-mm-section="license-active"></span>' +
					'<span data-mm-section="google-auth-failed"></span>' +
					'<span data-mm-section="google-auth-progress"></span>' +
					'<span data-mm-section="google-auth-with-dialogs"></span>' +
					'<div data-mm-section="google-auth-not-connected">' +
					'<form>' +
					'<div class="control-group">' +
					'<input type="text" name="account-name">' +
					'</div>' +
					'<div class="control-group">' +
					'<input type="text" placeholder="" name="email">' +
					'</div>' +
					'<div class="control-group">' +
					'<input type="checkbox" name="terms" id="gold-register-terms"/>' +
					'</div>' +
					'</form>' +
					'</div>' +
					'<span data-mm-section="cancelling-subscription"></span>' +
					'<span data-mm-role="expiry-date"></span>' +
					'<span data-mm-role="subscription-name"></span>' +
					'<span data-mm-role="account-name"></span>' +
					'<span data-mm-role="renewal-price"></span>' +
					'<div data-mm-role="payment-type-block">' +
					'<span data-mm-role="payment-type"></span>' +
					'<span data-mm-role="license-period"></span>' +
					'<span data-mm-role="license-provider"></span>' +
					'<span data-mm-role="license-method"></span>' +
					'</div>' +
					'<input type="text" data-mm-role="license-text"/>' +
					'<div class="control-group" id="gold-account-identifier-group">' +
					'<input type="text" data-mm-role="gold-account-identifier"/>' +
					'</div>' +
					'<div class="control-group" id="gold-access-code-group">' +
					'<input type="text" data-mm-role="gold-access-code"/>' +
					'</div>' +
					'<textarea data-mm-role="license-text" >dirty</textarea>' +
					'<input type="text" data-mm-role="account-name" value="dirty"/>' +
					'<span data-mm-role="expired">expired!</span>' +
					'<button data-mm-role="remove"/>' +
					'<button data-mm-role="go-back" />' +
					'<button data-mm-role="kickoff-sign-up"/>' +
					'<button data-mm-role="kickoff-restore-license"/>' +
					'<button data-mm-role="restore-license-with-code"/>' +
					'<button data-mm-role="action-CancelSubscription"/>' +
					'<button data-mm-role="register">Register</button>' +
					'<button data-mm-role="kickoff-google" id="google-no-dialogs">Google</button>' +
					'<button data-mm-role="kickoff-google" data-mm-showdialogs="true" id="google-with-dialogs">Google</button>' +
					'<button data-mm-role="action-Fart" data-mm-section="x">Fart</button>' +
					'<button data-mm-role="action-Burp" data-mm-section="x">Burp</button>' +
					'<button data-mm-role="action-Curse" data-mm-section="x">Curse</button>' +
					'<button name="btntest" data-mm-role="show-section" data-mm-target-section="code-sent"/>' +
					'<div data-mm-section="register">' +
					'<form>' +
					'<div class="control-group">' +
					'<input type="text" id="gold-register-account-name" name="account-name">' +
					'</div>' +
					'<div class="control-group">' +
					'<input type="text" id="gold-register-email" placeholder="" name="email">' +
					'</div>' +
					'<div class="control-group">' +
					'<input type="checkbox" name="terms" id="gold-register-terms"/>' +
					'</div>' +
					'</form>' +
					'</div>' +
					'<span data-mm-section="registration-fail"><span class="alert"><span data-mm-role="email-exists"></span><span data-mm-role="network-error"></span></span></span>' +
					'<span data-mm-section="registration-progress"></span>' +
					'<span data-mm-section="registration-success">' +
					'<span data-mm-role="license-capacity"/>' +
					'<span data-mm-role="license-has-grace-period"/>' +
					'<span data-mm-role="license-grace-period"/>' +
					'<span data-mm-role="license-email"/>' +
					'<span data-mm-role="license-expiry"/>' +
					'</span>' +
					'<select id="form-input-updater1" data-mm-role="form-input-updater" data-mm-form="form-to-update" data-mm-form-field="field-to-update">' +
						'<option value="FOO">foo</option>' +
						'<option selected value="NUMBERWANG">numberwang</option>' +
					'</select>' +
					'<select id="form-input-updater2" data-mm-role="form-input-updater" data-mm-form="form-to-update" data-mm-form-field="field-to-update">' +
						'<option value="FOO">foo</option>' +
						'<option selected value="NUMBERWANG">numberwang</option>' +
					'</select>' +
					'<form data-mm-role="form-to-update">' +
						'<input data-mm-role="field-to-update"/>' +
					'</form>' +
					'</div>',
		licenseManager,
		underTest,
		activityLog,
		requestCodeDeferred,
		goldApi,
		googleAuthenticator,
		dialogAuthenticateDeferred,
		authenticateDeferred,
		googleRestoreDeferred,
		registerDeferred,
		subscriptionDeferred,
		cancelSubscriptionDeferred,
		restoreLicenseWithCodeDeferred,
		futureTs,
		mockWindow,
		checkSectionShown = function (sectionName) {
			var visibleSections = [];
			_.each(underTest.find('[data-mm-section]'), function (sectionDom) {
				var section = jQuery(sectionDom);
				if (section.css('display') !== 'none') {
					visibleSections.push(section.data('mm-section'));
				}
			});
			expect(visibleSections).toEqual([sectionName]);
		};
	beforeEach(function () {
		mockWindow = observable({});
		futureTs = ((new Date()).getTime() + 100000) / 1000;
		licenseManager = observable(jasmine.createSpyObj('licenseManager', ['getLicense', 'cancelLicenseEntry', 'completeLicenseEntry', 'removeLicense', 'storeLicense']));
		registerDeferred = jQuery.Deferred();
		subscriptionDeferred = jQuery.Deferred();
		cancelSubscriptionDeferred = jQuery.Deferred();
		requestCodeDeferred = jQuery.Deferred();
		restoreLicenseWithCodeDeferred = jQuery.Deferred();
		dialogAuthenticateDeferred = jQuery.Deferred();
		authenticateDeferred = jQuery.Deferred();
		googleRestoreDeferred = jQuery.Deferred();
		goldApi = {
			register: jasmine.createSpy('register').and.returnValue(registerDeferred.promise()),
			getSubscription: jasmine.createSpy('getSubscription').and.callFake(/* so we can override later */ function () {
				return subscriptionDeferred.promise();
			}),
			cancelSubscription: jasmine.createSpy('cancelSubscription').and.returnValue(cancelSubscriptionDeferred.promise()),
			requestCode: jasmine.createSpy('requestCode').and.returnValue(requestCodeDeferred.promise()),
			restoreLicenseWithCode: jasmine.createSpy('restoreLicenseWithCode').and.returnValue(restoreLicenseWithCodeDeferred.promise()),
			restoreLicenseWithGoogle: jasmine.createSpy('restoreLicenseWithGoogle').and.returnValue(googleRestoreDeferred.promise())
		};
		googleAuthenticator = {
			authenticate: function (dialogs) {
				if (dialogs) {
					return dialogAuthenticateDeferred.promise();
				} else {
					return authenticateDeferred.promise();
				}
			}
		};
		spyOn(googleAuthenticator, 'authenticate').and.callThrough();
		activityLog = { log: jasmine.createSpy('log') };
		underTest = jQuery(template).appendTo('body').goldLicenseEntryWidget(licenseManager, goldApi, activityLog, mockWindow, googleAuthenticator);
		fakeBootstrapModal(underTest);
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('when invoked by license manager', function () {
		it('automatically shows modal when the license manager requests license entry', function () {
			licenseManager.dispatchEvent('license-entry-required');
			expect(underTest.modal).toHaveBeenCalledWith('show');
		});
		it('shows only the license-required section if the license manager does not contain a license', function () {
			licenseManager.getLicense.and.returnValue(undefined);
			licenseManager.dispatchEvent('license-entry-required');
			checkSectionShown('license-required');
		});
		it('shows only the unauthorised-license section if the license manager contains a license', function () {
			licenseManager.getLicense.and.returnValue({a: 1});
			subscriptionDeferred.resolve({expiry: 1, subscription: 'none'});
			licenseManager.dispatchEvent('license-entry-required');
			checkSectionShown('unauthorised-license');
		});
		it('invokes cancelLicenseEntry if hidden and license not entered', function () {
			licenseManager.dispatchEvent('license-entry-required');
			underTest.modal('hide');
			expect(licenseManager.cancelLicenseEntry).toHaveBeenCalled();
		});
		it('applies form-input-updater', function () {
			licenseManager.dispatchEvent('license-entry-required');
			expect(underTest.find('[data-mm-role="field-to-update"]').val()).toBe('NUMBERWANG');
		});
	});
	it('applies form-input-updater when value is changed', function () {
		licenseManager.dispatchEvent('license-entry-required');
		var select = underTest.find('#form-input-updater1');
		select.val('FOO');
		select.trigger(jQuery.Event('change'));

		expect(underTest.find('[data-mm-role="field-to-update"]').val()).toBe('FOO');
	});
	it('keeps form-input-updaters synchronised when value is changed', function () {
		licenseManager.dispatchEvent('license-entry-required');
		var select = underTest.find('#form-input-updater1');
		select.val('FOO');
		select.trigger(jQuery.Event('change'));

		expect(underTest.find('#form-input-updater2').val()).toBe('FOO');
	});
	describe('when invoked by menu directly', function () {
		beforeEach(function () {
			subscriptionDeferred.resolve({expiry: futureTs, subscription: '1 Year', price: '1 million dollars mwahahaha', status: 'active'});
		});
		it('shows only the no-license section if the license manager does not contain a license', function () {
			licenseManager.getLicense.and.returnValue(undefined);
			underTest.modal('show');
			checkSectionShown('no-license');
		});
		it('shows only the view-license section if the license manager contains a license', function () {
			licenseManager.getLicense.and.returnValue({a: 1});
			underTest.modal('show');

			checkSectionShown('license-active');
		});
		it('shows the correct section even if previously invoked by license manager [regression bug check]', function () {
			licenseManager.getLicense.and.returnValue({a: 1});
			licenseManager.dispatchEvent('license-entry-required');
			underTest.modal('hide');
			underTest.modal('show');
			checkSectionShown('license-active');
		});
		it('does not invoke cancelLicenseEntry if hidden', function () {
			underTest.modal('show');
			underTest.modal('hide');
			expect(licenseManager.cancelLicenseEntry).toHaveBeenCalled();
		});
	});
	describe('button actions', function () {
		beforeEach(function () {
			subscriptionDeferred.resolve({expiry: futureTs, subscription: '1 Year', price: '1 million dollars mwahahaha'});
		});
		it('removes the license and shows no-license when remove is clicked', function () {
			underTest.modal('show');
			underTest.find('[data-mm-role~=remove]').click();
			expect(licenseManager.removeLicense).toHaveBeenCalled();
			expect(underTest.is(':visible')).toBeTruthy();
			checkSectionShown('no-license');
		});
		it('shows the data-mm-section section when show-section is clicked', function () {
			underTest.modal('show');
			underTest.find('[name=btntest]').click();
			expect(underTest.is(':visible')).toBeTruthy();
			checkSectionShown('code-sent');
		});
		describe('when kickoff-sign-up button is clicked', function () {
			beforeEach(function () {
				underTest.modal('show');
			});
			it('moves to the register section', function () {
				underTest.find('[data-mm-role=gold-account-identifier]').val('hello');
				underTest.find('[data-mm-role=kickoff-sign-up]').click();
				checkSectionShown('register');
			});
			it('leaves both fields blank if nothing is supplied', function () {
				underTest.find('[data-mm-role=gold-account-identifier]').val('');
				underTest.find('[data-mm-role=kickoff-sign-up]').click();
				expect(underTest.find('#gold-register-account-name').val()).toEqual('');
				expect(underTest.find('#gold-register-email').val()).toEqual('');
			});
		});
		describe('when kickoff-restore-license is clicked', function () {
			beforeEach(function () {
				underTest.modal('show');
			});
			it('moves to the sending-code section', function () {
				underTest.find('[data-mm-role=gold-account-identifier]').val('hello');

				underTest.find('[data-mm-role=kickoff-restore-license]').click();

				checkSectionShown('sending-code');
			});
			it('uses goldApi to request a code', function () {
				underTest.find('[data-mm-role=gold-account-identifier]').val('hello');

				underTest.find('[data-mm-role=kickoff-restore-license]').click();

				expect(goldApi.requestCode).toHaveBeenCalledWith('hello');
			});
			it('marks input as error if it is empty', function () {
				underTest.find('[data-mm-role=gold-account-identifier]').val('');

				underTest.find('[data-mm-role=kickoff-restore-license]').click();

				checkSectionShown('no-license');
				expect(goldApi.requestCode).not.toHaveBeenCalled();
				expect(underTest.find('[data-mm-role=gold-account-identifier]').parents('.control-group').hasClass('error')).toBeTruthy();

			});
			describe('goldApi.promise result', function () {
				beforeEach(function () {
					underTest.find('[data-mm-role=gold-account-identifier]').val('hello');
					underTest.find('[data-mm-role=kickoff-restore-license]').click();
				});
				it('moves to the code-sent block when goldApi.requestCode promise is resolved', function () {
					requestCodeDeferred.resolve();
					checkSectionShown('code-sent');
				});
				it('moves to the sending-code-failed block when goldApi.requestCode promise is rejected', function () {
					requestCodeDeferred.reject();
					checkSectionShown('sending-code-failed');
				});
			});

		});
		describe('when restore-license-with-code button is clicked', function () {
			beforeEach(function () {
				underTest.modal('show');
				underTest.find('[data-mm-role=gold-account-identifier]').val('hello');
				underTest.find('[data-mm-role=kickoff-restore-license]').click();
				requestCodeDeferred.resolve();

			});
			it('shows the logging in section', function () {
				underTest.find('[data-mm-role=gold-access-code]').val('itissecret');
				underTest.find('[data-mm-role=restore-license-with-code]').click();
				checkSectionShown('sending-restore-license-code');
			});
			it('uses goldApi to restore the license', function () {
				underTest.find('[data-mm-role=gold-access-code]').val('itissecret');
				underTest.find('[data-mm-role=restore-license-with-code]').click();
				expect(goldApi.restoreLicenseWithCode).toHaveBeenCalledWith('itissecret');
			});
			it('marks code field as being in error if it is blank', function () {
				underTest.find('[data-mm-role=gold-access-code]').val('');
				underTest.find('[data-mm-role=restore-license-with-code]').click();
				expect(goldApi.restoreLicenseWithCode).not.toHaveBeenCalled();
				expect(underTest.find('[data-mm-role=gold-access-code]').parents('.control-group').hasClass('error')).toBeTruthy();
			});
			describe('goldApi.promise result', function () {
				beforeEach(function () {
					underTest.find('[data-mm-role=gold-access-code]').val('itissecret');
					underTest.find('[data-mm-role=restore-license-with-code]').click();
				});
				it('moves to the code-sent block when goldApi.requestCode promise is resolved', function () {
					restoreLicenseWithCodeDeferred.resolve();
					checkSectionShown('view-license');
				});
				it('moves to the sending-code-failed block when goldApi.requestCode promise is rejected', function () {
					restoreLicenseWithCodeDeferred.reject();
					checkSectionShown('restore-code-failed');
				});
				/* todo: add docs for subscription request and license entry completion */
			});
		});
		describe('when kickoff-google/no dialogs button is clicked', function () {
			beforeEach(function () {
				underTest.modal('show');
				underTest.find('#google-no-dialogs').click();
			});
			it('shows google-auth-progress section', function () {
				checkSectionShown('google-auth-progress');
			});
			it('calls the google authenticator to authorise without dialogs and allow e-mail access', function () {
				expect(googleAuthenticator.authenticate).toHaveBeenCalledWith(false, true);
				expect(goldApi.restoreLicenseWithGoogle).not.toHaveBeenCalled();
			});
			it('attempts to restore license via google if immediate authentication succeeds', function () {
				authenticateDeferred.resolve('token1');
				expect(goldApi.restoreLicenseWithGoogle).toHaveBeenCalledWith('token1');
				checkSectionShown('google-auth-progress');
			});
			it('shows the google-auth-with-dialogs if immediate authenticationf ails', function () {
				googleAuthenticator.authenticate.calls.reset();
				authenticateDeferred.reject();
				expect(goldApi.restoreLicenseWithGoogle).not.toHaveBeenCalled();
				checkSectionShown('google-auth-with-dialogs');
			});
			it('shows google-auth-not-connected and prepoulates email field if restoring license via google fails with not-connected', function () {
				authenticateDeferred.resolve('token1');
				googleRestoreDeferred.reject('not-connected foo@bar.com');
				checkSectionShown('google-auth-not-connected');
				expect(underTest.find('[data-mm-section=google-auth-not-connected] input[name=email]').val()).toEqual('foo@bar.com');
			});
			it('shows google-auth-failed if restoring fails with not-connected but no email', function () {
				authenticateDeferred.resolve('token1');
				googleRestoreDeferred.reject('not-connected');
				checkSectionShown('google-auth-failed');
			});
			it('shows google-auth-failed if restoring license via google fails otherwise', function () {
				authenticateDeferred.resolve('token1');
				googleRestoreDeferred.reject('invalid-args');
				checkSectionShown('google-auth-failed');
			});
			describe('completing subscription workflow', function () {
				beforeEach(function () {
					subscriptionDeferred = jQuery.Deferred();
					authenticateDeferred.resolve('token1');
					googleRestoreDeferred.resolve();
				});
				it('shows section view-license', function () {
					checkSectionShown('view-license');
				});
				it('retrieves subscription using goldApi', function () {
					expect(goldApi.getSubscription).toHaveBeenCalled();
				});
				it('completes license entry when a payment is triggered and the license is valid', function () {
					subscriptionDeferred.resolve({expiry: futureTs, subscription: '1 Year', renewalPrice: '1 million dollars mwahahaha', status: 'active'});
					expect(licenseManager.completeLicenseEntry).toHaveBeenCalled();
				});
				it('does not complete license entry if license is expired', function () {
					subscriptionDeferred.resolve({status: 'borked', subscription: '1 Year', renewalPrice: '1 million dollars mwahahaha'});
					expect(licenseManager.completeLicenseEntry).not.toHaveBeenCalled();
				});
			});
		});
		describe('when kickoff-google/with dialogs button is clicked', function () {
			beforeEach(function () {
				underTest.modal('show');
				underTest.find('#google-with-dialogs').click();
			});
			it('shows google-auth-progress section', function () {
				checkSectionShown('google-auth-progress');
			});
			it('calls the google authenticator to authorise with dialogs and allow e-mail access', function () {
				expect(googleAuthenticator.authenticate).toHaveBeenCalledWith(true, true);
				expect(goldApi.restoreLicenseWithGoogle).not.toHaveBeenCalled();
			});
			it('attempts to restore license via google if authentication succeeds', function () {
				dialogAuthenticateDeferred.resolve('token1');
				expect(goldApi.restoreLicenseWithGoogle).toHaveBeenCalledWith('token1');
				checkSectionShown('google-auth-progress');
			});
			it('shows google-auth-failed section if dialog authentication fails', function () {
				authenticateDeferred.reject();
				dialogAuthenticateDeferred.reject();
				checkSectionShown('google-auth-failed');
			});
			it('shows google-auth-not-connected and prepoulates email field if restoring license via google fails with not-connected', function () {
				dialogAuthenticateDeferred.resolve('token1');
				googleRestoreDeferred.reject('not-connected foo@bar.com');
				checkSectionShown('google-auth-not-connected');
				expect(underTest.find('[data-mm-section=google-auth-not-connected] input[name=email]').val()).toEqual('foo@bar.com');
			});
			it('shows google-auth-failed if restoring fails with not-connected but no email', function () {
				dialogAuthenticateDeferred.resolve('token1');
				googleRestoreDeferred.reject('not-connected');
				checkSectionShown('google-auth-failed');
			});
			it('shows google-auth-failed if restoring license via google fails otherwise', function () {
				dialogAuthenticateDeferred.resolve('token1');
				googleRestoreDeferred.reject('invalid-args');
				checkSectionShown('google-auth-failed');
			});
			describe('completing subscription workflow', function () {
				beforeEach(function () {
					subscriptionDeferred = jQuery.Deferred();
					dialogAuthenticateDeferred.resolve('token1');
					googleRestoreDeferred.resolve();
				});
				it('shows section view-license', function () {
					checkSectionShown('view-license');
				});
				it('retrieves subscription using goldApi', function () {
					expect(goldApi.getSubscription).toHaveBeenCalled();
				});
				it('completes license entry when a payment is triggered and the license is valid', function () {
					subscriptionDeferred.resolve({expiry: futureTs, subscription: '1 Year', renewalPrice: '1 million dollars mwahahaha', status: 'active'});
					expect(licenseManager.completeLicenseEntry).toHaveBeenCalled();
				});
				it('does not complete license entry if license is expired', function () {
					subscriptionDeferred.resolve({status: 'borked', subscription: '1 Year', renewalPrice: '1 million dollars mwahahaha'});
					expect(licenseManager.completeLicenseEntry).not.toHaveBeenCalled();
				});
			});
		});
		describe('when cancel-subscription button clicked', function () {
			beforeEach(function () {
				licenseManager.getLicense.and.returnValue({a: 1});
				underTest.modal('show');
				underTest.find('button[data-mm-role=action-CancelSubscription]').click();
			});
			it('shows cancelling-subscription section', function () {
				checkSectionShown('cancelling-subscription');
			});
			it('calls goldApi.cancelSubscription ', function () {
				expect(goldApi.cancelSubscription).toHaveBeenCalled();
			});
			it('shows the cancelled section if cancelellation returns ok', function () {
				cancelSubscriptionDeferred.resolve('ok');
				checkSectionShown('cancelled-subscription');
			});
			it('shows the view-license section if cancelellation fails', function () {
				cancelSubscriptionDeferred.reject('error');
				checkSectionShown('cancellation-failed');
			});
		});

	});

	describe('pre-populating fields on display', function () {
		var currentLicense;
		beforeEach(function () {
			currentLicense = {account: 'test-acc'};
			licenseManager.getLicense.and.returnValue(currentLicense);
		});
		it('fills in input fields data-mm-role=account-name with the current license account name', function () {
			underTest.modal('show');
			expect(underTest.find('span[data-mm-role~=account-name]').text()).toBe('test-acc');
		});
		it('fills in anything with data-mm-role=expiry-date with the current license expiry date, formatted as date, set', function () {
			subscriptionDeferred.resolve({expiry: futureTs, subscription: '1 year', status: 'active'});
			underTest.modal('show');
			var stringInField = underTest.find('span[data-mm-role~=expiry-date]').text();
			expect(stringInField).toEqual(new Date(futureTs * 1000).toDateString());
		});
		it('fills in anything with the data-mm-role=license-text with the current license text formatted as JSON', function () {
			underTest.modal('show');
			expect(underTest.find('input[data-mm-role~=license-text]').val()).toBe('{"account":"test-acc"}');
			underTest.find('[data-mm-role~=license-text]').each(function () {
				expect(jQuery(this).val()).toEqual('{"account":"test-acc"}');
			});
		});
		it('clears in anything with data-mm-role=license-text, expiry-date, subscription name and account-name if the license is not defined, and hides anything with data-mm-role=expired', function () {
			licenseManager.getLicense = jasmine.createSpy('getLicense').and.returnValue(false);
			underTest.modal('show');
			expect(underTest.find('span[data-mm-role~=expiry-date]').text()).toEqual('');
			expect(underTest.find('span[data-mm-role~=subscription-name]').text()).toEqual('');
			expect(underTest.find('span[data-mm-role~=account-name]').text()).toEqual('');
			underTest.find('[data-mm-role~=license-text]').each(function () {
				expect(jQuery(this).val()).toEqual('');
			});
		});
		it('fills in any fields matching license-* roles', function () {
			subscriptionDeferred.resolve({status: 'active', expiry: futureTs, period: 'eternal', provider: 'a-real-bank', method: 'firstborn child', price: '1 million dollars mwahahaha'});
			underTest.modal('show');
			expect(underTest.find('span[data-mm-role~=license-method]').text()).toEqual('firstborn child');
			expect(underTest.find('span[data-mm-role~=license-provider]').text()).toEqual('a-real-bank');
			expect(underTest.find('span[data-mm-role~=license-period]').text()).toEqual('eternal');
		});
		it('fills in the renewal price', function () {
			subscriptionDeferred.resolve({status: 'active', expiry: futureTs, period: 'eternal', provider: 'a-real-bank', method: 'firstborn child', price: '1 million dollars mwahahaha'});
			underTest.modal('show');
			expect(underTest.find('span[data-mm-role~=renewal-price]').text()).toEqual('1 million dollars mwahahaha');
		});

	});

	describe('hide/show action buttons according to license status', function () {
		var currentLicense;
		beforeEach(function () {
			currentLicense = {account: 'test-acc'};
			licenseManager.getLicense.and.returnValue(currentLicense);
		});
		it('activates required action buttons when license resolves', function () {
			underTest.find('[data-mm-role~=action-Fart]').hide();
			underTest.find('[data-mm-role~=action-Burp]').show();
			underTest.find('[data-mm-role~=action-Curse]').show();

			subscriptionDeferred.resolve({status: 'active', expiry: futureTs, actions:['Fart', 'Burp']});
			underTest.modal('show');
			expect(underTest.find('[data-mm-role~=action-Fart]').css('display')).not.toBe('none');
			expect(underTest.find('[data-mm-role~=action-Burp]').css('display')).not.toBe('none');
			expect(underTest.find('[data-mm-role~=action-Curse]').css('display')).toBe('none');
		});
	});
	describe('handling invalid or expired licenses when view-license or loading-subscription is showing', function () {
		describe('when view-license is showing', function () {
			beforeEach(function () {
				licenseManager.getLicense.and.returnValue({a: 1});
				underTest.modal('show'); // this will show view-license because license manager contains a license
			});
			afterEach(function () {
				underTest.modal('hide');
			});



			it('switches to license-STATUS_NAME section', function () {
				subscriptionDeferred.resolve({expiry: 12345, status: 'purchase-required' });
				checkSectionShown('license-purchase-required');
			});

			it('switches to invalid-license section if the expiry date comes back with 0', function () {
				subscriptionDeferred.resolve({expiry: 0, subscription: 'none'});
				checkSectionShown('invalid-license');
			});
			it('switches to invalid-license section if the expiry date retrieval fails with not-authenticated', function () {
				subscriptionDeferred.reject('not-authenticated');
				checkSectionShown('invalid-license');
			});

			it('switches to license-server-unavailable section if the expiry date retrieval fails with something else', function () {
				subscriptionDeferred.reject('something else');
				checkSectionShown('license-server-unavailable');
			});
		});
		describe('when something else is showing', function () {
			beforeEach(function () {
				licenseManager.getLicense.and.returnValue({a: 1});
				licenseManager.dispatchEvent('license-entry-required');
			});
			it('does not switch to license-purchase-required section if the expiry date comes back with -1', function () {
				subscriptionDeferred.resolve({status: 'purchase-required', expiry: -1, subscription: 'none'});
				checkSectionShown('unauthorised-license');
			});
			it('does not switch to invalid-license section if the expiry date fails', function () {
				subscriptionDeferred.reject('something else');
				checkSectionShown('unauthorised-license');
			});
		});
	});
	describe('payment workflow', function () {
		it('shows payment complete and completes license entry when a payment is triggered and the license is valid', function () {
			mockWindow.dispatchEvent('message', {data: {goldApi: 'reload'}});
			subscriptionDeferred.resolve({expiry: futureTs, subscription: '1 Year', renewalPrice: '1 million dollars mwahahaha', status: 'active'});
			checkSectionShown('payment-complete');
			expect(licenseManager.completeLicenseEntry).toHaveBeenCalled();
		});
		it('does not complete license entry if license is expired', function () {
			mockWindow.dispatchEvent('message', {data: {goldApi: 'reload'}});
			subscriptionDeferred.resolve({status: 'borked', subscription: '1 Year', renewalPrice: '1 million dollars mwahahaha'});

			expect(licenseManager.completeLicenseEntry).not.toHaveBeenCalled();
		});
	});
	describe('registration workflow', function () {
		beforeEach(function () {
			underTest.find('[data-mm-role=kickoff-sign-up]').click();
			underTest.find('[data-mm-section=register] input[name=account-name]').val('greg');
			underTest.find('[data-mm-section=register] input[name=email]').val('the@baker.com');
			underTest.find('[data-mm-section=register] input[name=terms]').prop('checked', true);
		});
		it('attempts to register if register button is clicked and email and account name are valid', function () {
			underTest.find('[data-mm-role=register]').click();
			expect(goldApi.register).toHaveBeenCalledWith('greg', 'the@baker.com');
		});
		it('shows registration-progress section if registration starts', function () {
			underTest.find('[data-mm-role=register]').click();
			checkSectionShown('registration-progress');
		});
		describe('marks email as invalid if it does not contain @ and is followed by a .: ', function () {
			_.each(['@test@test.com', 'test@.test.com', 'test.test.com', 'test', 'test@test', 'test@test.com.', 'test@test.com@', 'test.test.com@'], function (email) {
				it ('rejects ' + email, function () {
					underTest.find('[data-mm-section=register] input[name=email]').val(email);
					underTest.find('[data-mm-role=register]').click();
					expect(goldApi.register).not.toHaveBeenCalled();
					expect(underTest.find('input[name=email]').parents('.control-group').hasClass('error')).toBeTruthy();
				});
			});
			_.each(['test..test@test.com', 'test@test.me.uk', 'test.@test.com', '.test@test.com', 'test.test@test.test', 'test@test.com', '123@123.123', 'ABDC@ABDC.COM'], function (email) {
				it ('accepts ' + email, function () {
					underTest.find('[data-mm-section=register] input[name=email]').val(email);
					underTest.find('[data-mm-role=register]').click();
					expect(goldApi.register).toHaveBeenCalled();
					expect(underTest.find('input[name=email]').parents('.control-group').hasClass('error')).toBeFalsy();
				});

			});
		});
		describe('marks account name as invalid if it is not 4-20 chars and only alphanumeric lowercase', function () {
			_.each(['abc', '123456789012345678901', 'ab_cd', 'abc@d', 'abcD', 'abcd efgh', 'abcd-efgh'], function (name) {
				it('rejects ' + name, function () {
					underTest.find('[data-mm-section=register] input[name=account-name]').val(name);
					underTest.find('[data-mm-role=register]').click();
					expect(goldApi.register).not.toHaveBeenCalled();
					expect(underTest.find('input[name=account-name]').parents('.control-group').hasClass('error')).toBeTruthy();
				});
			});
		});
		it('marks the terms checkbox as invalid if not clicked', function () {
			underTest.find('[data-mm-section=register] input[name=terms]').prop('checked', false);
			underTest.find('[data-mm-role=register]').click();
			expect(goldApi.register).not.toHaveBeenCalled();
			expect(underTest.find('input[name=terms]').parents('.control-group').hasClass('error')).toBeTruthy();
		});
		it('shows registration-fail section and highlights the appropriate message if registration fails', function () {
			underTest.find('[data-mm-role=register]').click();
			registerDeferred.reject('email-exists');
			checkSectionShown('registration-fail');
			expect(underTest.find('[data-mm-section=registration-fail] [data-mm-role=email-exists]').is(':visible')).toBeTruthy();
			expect(underTest.find('[data-mm-section=registration-fail] [data-mm-role=network-error]').is(':visible')).toBeFalsy();
		});
		it('shows registration-fail section and highlights a generic message if registration fails unexpectedly', function () {
			underTest.find('[data-mm-role=register]').click();
			registerDeferred.reject('unexpected');
			expect(underTest.find('[data-mm-section=registration-fail] [data-mm-role=email-exists]').is(':visible')).toBeFalsy();
			expect(underTest.find('[data-mm-section=registration-fail] [data-mm-role=network-error]').is(':visible')).toBeTruthy();
		});
		it('shows previous section if go-back is clicked', function () {
			licenseManager.getLicense.and.returnValue(undefined);
			underTest.modal('show');
			underTest.find('[data-mm-role=register]').click();
			underTest.find('[data-mm-role=go-back]').click();
			checkSectionShown('no-license');
		});
		it('shows registration-success section if registration succeeds', function () {
			underTest.find('[data-mm-role=register]').click();
			registerDeferred.resolve({});
			checkSectionShown('registration-success');
		});

		it('fills in license-capacity, grace-period, email, license-text when registration succeeds', function () {
			underTest.find('[data-mm-role=register]').click();
			registerDeferred.resolve({
				'capacity': 'cap',
				'grace-period': 'grace',
				'email': 'em',
				'license': 'new license'
			});
			checkSectionShown('registration-success');
			expect(underTest.find('[data-mm-role=license-capacity]').text()).toEqual('cap');
			expect(underTest.find('[data-mm-role=license-has-grace-period]').is(':visible')).toBeTruthy();
			expect(underTest.find('[data-mm-role=license-grace-period]').text()).toEqual('grace');
			expect(underTest.find('[data-mm-role=license-email]').text()).toEqual('em');
			expect(underTest.find('[data-mm-role=license-text]').val()).toEqual('new license');
		});
		it('hides grace period wording if license does not have grace period because expiry is -1', function () {
			underTest.find('[data-mm-role=register]').click();
			registerDeferred.resolve({
				'capacity': 'cap',
				'expiry': -1,
				'email': 'em'
			});
			checkSectionShown('registration-success');
			expect(underTest.find('[data-mm-role=license-has-grace-period]').is(':visible')).toBeFalsy();
		});
		it('hides grace period wording if license does not have grace period because expiry undefined', function () {
			underTest.find('[data-mm-role=register]').click();
			registerDeferred.resolve({
				'capacity': 'cap',
				'email': 'em'
			});
			checkSectionShown('registration-success');
			expect(underTest.find('[data-mm-role=license-has-grace-period]').is(':visible')).toBeFalsy();

		});
	});

	describe('event logging', function () {
		it('logs opening of the dialog', function () {
			underTest.modal('show');
			expect(activityLog.log).toHaveBeenCalledWith('Gold', 'license-show');
		});
		it('logs showing each section', function () {
			underTest.find('[name=btntest]').click();
			expect(activityLog.log).toHaveBeenCalledWith('Gold', 'license-section', 'code-sent');
		});
	});
});
