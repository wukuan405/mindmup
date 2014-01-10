/*global beforeEach, fakeBootstrapModal, describe, jasmine, it, jQuery, observable, expect, afterEach, _*/
describe('Gold License Widget', function () {
	'use strict';
	var template = '<div class="modal">' +
					'<span data-mm-section="license-required"></span>' +
					'<span data-mm-section="unauthorised-license"></span>' +
					'<span data-mm-section="invalid-license"></span>' +
					'<span data-mm-section="expired-license"></span>' +
					'<span data-mm-section="license-server-unavailable"></span>' +
					'<span data-mm-section="license-details"></span>' +
					'<span data-mm-section="no-license"></span>' +
					'<span data-mm-section="view-license"></span>' +
					'<input type="text" data-mm-role="expiry-date" value="dirty"/>' +
					'<input type="text" data-mm-role="license-text" value="dirty"/>' +
					'<textarea data-mm-role="license-text" >dirty</textarea>' +
					'<input type="text" data-mm-role="account-name" value="dirty"/>' +
					'<span data-mm-role="expired">expired!</span>' +
					'<button data-mm-role="remove"/>' +
					'<button data-mm-role="save-license"/>' +
					'<button data-mm-role="register">Register</button>' +
					'<button name="btntest" data-mm-role="show-section" data-mm-target-section="license-details"/>' +
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
					'<span data-mm-section="register"></span>' +
					'<span data-mm-section="registration-fail"><span class="alert"><span data-mm-role="email-exists"></span><span data-mm-role="network-error"></span></span></span>' +
					'<span data-mm-section="registration-progress"></span>' +
					'<span data-mm-section="registration-success">' +
					'<span data-mm-role="license-capacity"/>' +
					'<span data-mm-role="license-grace-period"/>' +
					'<span data-mm-role="license-email"/>' +
					'<span data-mm-role="license-expiry"/>' +
					'<a data-mm-role="license-payment-url" href="http://payment" target="_blank"/>' +
					'</span>' +
					'</div>',
		licenseManager,
		underTest,
		activityLog,
		fileReader,
		goldApi,
		registerDeferred,
		expiryDeferred,
		checkSectionShown = function (sectionName) {
			expect(underTest.find('[data-mm-section]').not('[data-mm-section~=' + sectionName + ']').css('display')).toBe('none');
			expect(underTest.find('[data-mm-section~=' + sectionName + ']').length > 0).toBeTruthy();
			expect(underTest.find('[data-mm-section~=' + sectionName + ']').css('display')).not.toBe('none');
		};
	beforeEach(function () {
		licenseManager = observable({
			getLicense: jasmine.createSpy('getLicense'),
			cancelLicenseEntry: jasmine.createSpy('cancelLicenseEntry'),
			removeLicense: jasmine.createSpy('removeLicense'),
			storeLicense: jasmine.createSpy('storeLicense')
		});
		registerDeferred = jQuery.Deferred();
		expiryDeferred = jQuery.Deferred();
		goldApi = { register: jasmine.createSpy('register').andReturn(registerDeferred.promise()), getExpiry: jasmine.createSpy('register').andReturn(expiryDeferred.promise()) };
		activityLog = { log: jasmine.createSpy('log') };
		fileReader = jasmine.createSpy('fileReaderWidget');
		/*jshint camelcase: false */
		jQuery.fn.file_reader_upload = fileReader;
		underTest = jQuery(template).appendTo('body').goldLicenseEntryWidget(licenseManager, goldApi, activityLog);
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
			licenseManager.getLicense.andReturn(undefined);
			licenseManager.dispatchEvent('license-entry-required');
			checkSectionShown('license-required');
		});
		it('shows only the unauthorised-license section if the license manager contains a license', function () {
			licenseManager.getLicense.andReturn({a: 1});
			licenseManager.dispatchEvent('license-entry-required');
			checkSectionShown('unauthorised-license');
		});
		it('invokes cancelLicenseEntry if hidden and license not entered', function () {
			licenseManager.dispatchEvent('license-entry-required');
			underTest.modal('hide');
			expect(licenseManager.cancelLicenseEntry).toHaveBeenCalled();
		});
	});
	describe('when invoked by menu directly', function () {
		it('shows only the no-license section if the license manager does not contain a license', function () {
			licenseManager.getLicense.andReturn(undefined);
			underTest.modal('show');
			checkSectionShown('no-license');
		});
		it('shows only the view-license section if the license manager contains a license', function () {
			licenseManager.getLicense.andReturn({a: 1});
			underTest.modal('show');
			checkSectionShown('view-license');
		});
		it('shows the correct section even if previously invoked by license manager [regression bug check]', function () {
			licenseManager.getLicense.andReturn({a: 1});
			licenseManager.dispatchEvent('license-entry-required');
			underTest.modal('hide');
			underTest.modal('show');
			checkSectionShown('view-license');
		});
		it('does not invoke cancelLicenseEntry if hidden', function () {
			underTest.modal('show');
			underTest.modal('hide');
			expect(licenseManager.cancelLicenseEntry).toHaveBeenCalled();
		});
	});
	describe('button actions', function () {
		it('removes the license and shows no-license when remove is clicked', function () {
			underTest.modal('show');
			underTest.find('[data-mm-role~=remove]').click();
			expect(licenseManager.removeLicense).toHaveBeenCalled();
			expect(underTest.is(':visible')).toBeTruthy();
			checkSectionShown('no-license');
		});
		it('changes the license if valid license uploaded and shows the view-license section', function () {
			underTest.modal('show');
			licenseManager.storeLicense.andReturn(true);

			fileReader.mostRecentCall.args[1]('some text');

			expect(licenseManager.storeLicense).toHaveBeenCalledWith('some text');
			expect(underTest.is(':visible')).toBeTruthy();
			checkSectionShown('view-license');
		});
		it('automatically closes the dialog when valid license is uploaded if loaded from the license manager', function () {
			licenseManager.storeLicense.andReturn(true);
			licenseManager.dispatchEvent('license-entry-required');

			fileReader.mostRecentCall.args[1]('some text');

			expect(licenseManager.storeLicense).toHaveBeenCalledWith('some text');
			expect(underTest.is(':visible')).toBeFalsy();
		});
		it('shows a validation error and keeps the dialog open if invalid license is uploaded', function () {
			underTest.modal('show');
			licenseManager.storeLicense.andReturn(false);

			fileReader.mostRecentCall.args[1]('some text');

			expect(underTest.is(':visible')).toBeTruthy();
			checkSectionShown('invalid-license');
		});
		it('shows the data-mm-section section when show-section is clicked', function () {
			underTest.modal('show');
			underTest.find('[name=btntest]').click();
			expect(underTest.is(':visible')).toBeTruthy();
			checkSectionShown('license-details');
		});

		describe('edit license text', function () {
			it('changes the license if valid license saved and shows the view-license section', function () {
				underTest.modal('show');
				underTest.find('textarea[data-mm-role=license-text]').val('some text');
				licenseManager.storeLicense.andReturn(true);


				underTest.find('[data-mm-role=save-license]').click();

				expect(licenseManager.storeLicense).toHaveBeenCalledWith('some text');
				expect(underTest.is(':visible')).toBeTruthy();
				checkSectionShown('view-license');
			});
			it('automatically closes the dialog when valid license is uploaded if loaded from the license manager', function () {
				licenseManager.storeLicense.andReturn(true);
				licenseManager.dispatchEvent('license-entry-required');
				underTest.find('textarea[data-mm-role=license-text]').val('some text');

				underTest.find('[data-mm-role=save-license]').click();

				expect(licenseManager.storeLicense).toHaveBeenCalledWith('some text');
				expect(underTest.is(':visible')).toBeFalsy();
			});
			it('shows a validation error and keeps the dialog open if invalid license is uploaded', function () {
				underTest.modal('show');
				underTest.find('textarea[data-mm-role=license-text]').val('some text');
				licenseManager.storeLicense.andReturn(false);

				underTest.find('[data-mm-role=save-license]').click();

				expect(underTest.is(':visible')).toBeTruthy();
				checkSectionShown('invalid-license');
			});
		});

	});

	describe('pre-populating fields on display', function () {
		var currentLicense;
		beforeEach(function () {
			currentLicense = {account: 'test-acc'};
			licenseManager.getLicense.andReturn(currentLicense);
		});
		it('fills in input fields data-mm-role=account-name with the current license account name', function () {
			underTest.modal('show');
			expect(underTest.find('input[data-mm-role~=account-name]').val()).toBe('test-acc');
		});
		it('fills in anything with data-mm-role=expiry-date with the current license expiry date, formatted as date', function () {
			expiryDeferred.resolve('1417132800');
			underTest.modal('show');
			var stringInField = underTest.find('input[data-mm-role~=expiry-date]').val();
			expect(Date.parse(stringInField) / 1000).toEqual(1417132800);
		});
		it('fills in anything with the data-mm-role=license-text with the current license text formatted as JSON', function () {
			underTest.modal('show');
			expect(underTest.find('input[data-mm-role~=license-text]').val()).toBe('{"account":"test-acc"}');
			underTest.find('[data-mm-role~=license-text]').each(function () {
				expect(jQuery(this).val()).toEqual('{"account":"test-acc"}');
			});
		});
		it('clears in anything with data-mm-role=license-text, expiry-date and account-name if the license is not defined, and hides anything with data-mm-role=expired', function () {
			licenseManager.getLicense = jasmine.createSpy('getLicense').andReturn(false);
			underTest.modal('show');
			expect(underTest.find('input[data-mm-role~=expiry-date]').val()).toEqual('');
			expect(underTest.find('input[data-mm-role~=account-name]').val()).toEqual('');
			underTest.find('[data-mm-role~=license-text]').each(function () {
				expect(jQuery(this).val()).toEqual('');
			});
		});


	});
	describe('handling invalid or expired licenses when view-license is showing', function () {
		describe('when view-license is showing', function () {
			beforeEach(function () {
				licenseManager.getLicense.andReturn({a: 1});
				underTest.modal('show'); // this will show view-license because license manager contains a license
			});
			afterEach(function () {
				underTest.modal('hide');
			});
			it('switches to invalid-license section if the expiry date comes back with 0', function () {
				expiryDeferred.resolve('0');
				checkSectionShown('invalid-license');
			});
			it('switches to invalid-license section if the expiry date retrieval fails with not-authenticated', function () {
				expiryDeferred.reject('not-authenticated');
				checkSectionShown('invalid-license');
			});
			it('switches to expired-license section if the expiry date comes back with a past date (>0)', function () {
				expiryDeferred.resolve('1');
				checkSectionShown('expired-license');
			});
			it('switches to license-server-unavailable section if the expiry date retrieval fails with something else', function () {
				expiryDeferred.reject('something else');
				checkSectionShown('license-server-unavailable');
			});
		});
		describe('when something else is showing', function () {
			beforeEach(function () {
				licenseManager.getLicense.andReturn({a: 1});
				licenseManager.dispatchEvent('license-entry-required');
			});
			it('does not switch to invalid-license section if the expiry date comes back with 0', function () {
				expiryDeferred.resolve('0');
				checkSectionShown('unauthorised-license');
			});
			it('does not switch to invalid-license section if the expiry date fails', function () {
				expiryDeferred.reject('something else');
				checkSectionShown('unauthorised-license');
			});
		});
	});
	describe('registration workflow', function () {
		beforeEach(function () {
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
		it('marks email as invalid if it does not contain @ and does not try to register', function () {
			underTest.find('[data-mm-section=register] input[name=email]').val('greg');
			underTest.find('[data-mm-role=register]').click();
			expect(goldApi.register).not.toHaveBeenCalled();
			expect(underTest.find('input[name=email]').parents('.control-group').hasClass('error')).toBeTruthy();
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
		it('shows registration-success section if registration succeeds', function () {
			underTest.find('[data-mm-role=register]').click();
			registerDeferred.resolve({});
			checkSectionShown('registration-success');
		});
		it('fills in license-capacity, grace-period, expiry, email and payment-url when registration succeeds', function () {
			underTest.find('[data-mm-role=register]').click();
			registerDeferred.resolve({
				'capacity': 'cap',
				'grace-period': 'grace',
				'expiry': 1388029193,
				'email': 'em',
				'payment-url': 'purl'
			});
			checkSectionShown('registration-success');
			expect(underTest.find('[data-mm-role=license-capacity]').text()).toEqual('cap');
			expect(underTest.find('[data-mm-role=license-grace-period]').text()).toEqual('grace');
			expect(underTest.find('[data-mm-role=license-expiry]').text()).toEqual('Thu Dec 26 2013');
			expect(underTest.find('[data-mm-role=license-email]').text()).toEqual('em');
			expect(underTest.find('[data-mm-role=license-payment-url]').attr('href')).toEqual('purl');
		});

	});
	describe('event logging', function () {
		it('logs opening of the dialog', function () {
			underTest.modal('show');
			expect(activityLog.log).toHaveBeenCalledWith('Gold', 'license-show');
		});
		it('logs setting the license', function () {
			licenseManager.storeLicense.andReturn(true);
			fileReader.mostRecentCall.args[1]('some text');
			expect(activityLog.log).toHaveBeenCalledWith('Gold', 'license-set');
		});
		it('logs clicks on every link by the link href', function () {
			underTest.find('a[data-mm-role=license-payment-url]').click();
			expect(activityLog.log).toHaveBeenCalledWith('Gold', 'license-click', 'http://payment/');
		});
		it('logs clicks on every button by the button text', function () {
			underTest.find('button[data-mm-role=register]').click();
			expect(activityLog.log).toHaveBeenCalledWith('Gold', 'license-click', 'Register');
		});
		it('logs showing each section', function () {
			underTest.find('[name=btntest]').click();
			expect(activityLog.log).toHaveBeenCalledWith('Gold', 'license-section', 'license-details');
		});
	});
});
