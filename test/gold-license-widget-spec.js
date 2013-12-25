/*global beforeEach, fakeBootstrapModal, describe, jasmine, it, jQuery, observable, expect, afterEach*/
describe('Gold License Widget', function () {
	'use strict';
	var template = '<div class="modal">' +
					'<span data-mm-section="license-required"></span>' +
					'<span data-mm-section="unauthorised-license"></span>' +
					'<span data-mm-section="invalid-license"></span>' +
					'<span data-mm-section="license-details"></span>' +
					'<span data-mm-section="no-license"></span>' +
					'<span data-mm-section="view-license"></span>' +
					'<input type="text" data-mm-role="expiry-date" value="dirty"/>' +
					'<input type="text" data-mm-role="account-name" value="dirty"/>' +
					'<span data-mm-role="expired">expired!</span>' +
					'<button data-mm-role="remove"/>' +
					'<button name="btntest" data-mm-role="show-section" data-mm-target-section="license-details"/>' +
					'</div>',
		licenseManager,
		underTest,
		activityLog,
		fileReader,
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
		activityLog = { log: jasmine.createSpy('log') };
		fileReader = jasmine.createSpy('fileReaderWidget');
		jQuery.fn.file_reader_upload = fileReader; 
		underTest = jQuery(template).appendTo('body').goldLicenseEntryWidget(licenseManager, activityLog);
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

	});

	describe('pre-populating fields on display', function () {
		var currentLicense;
		beforeEach(function () {
			currentLicense = {account: 'test-acc', expiry: '1417132800'};
			licenseManager.getLicense.andReturn(currentLicense);
		});
		it('fills in input fields data-mm-role=account-name with the current license account name', function () {
			underTest.modal('show');
			expect(underTest.find('input[data-mm-role~=account-name]').val()).toBe('test-acc');
		});
		it('fills in anything with data-mm-role=expiry-date with the current license expiry date, formatted as date', function () {
			underTest.modal('show');
			var stringInField = underTest.find('input[data-mm-role~=expiry-date]').val();
			expect(Date.parse(stringInField) / 1000).toEqual(1417132800);
		});
		it('shows anything with data-mm-role=expired if license has expired', function () {
			currentLicense.expiry = (Date.now() / 1000) - 100;
			underTest.modal('show');
			expect(underTest.find('[data-mm-role=expired]').is(':visible')).toBeTruthy();
		});
		it('hides anything with data-mm-role=expired if the license has not expired', function () {
			currentLicense.expiry = (Date.now() / 1000) + 100;
			underTest.modal('show');
			expect(underTest.find('[data-mm-role=expired]').is(':visible')).toBeFalsy();
		});
		it('clears in anything with data-mm-role=license, expiry-date and account-name if the license is not defined, and hides anything with data-mm-role=expired', function () {
			licenseManager.getLicense = jasmine.createSpy('getLicense').andReturn(false);
			underTest.modal('show');
			expect(underTest.find('input[data-mm-role~=expiry-date]').val()).toEqual('');
			expect(underTest.find('input[data-mm-role~=account-name]').val()).toEqual('');
			expect(underTest.find('[data-mm-role~=expired]').is(':visible')).toBeFalsy();
		});
	});
	/*
	describe('registration workflow', function () {
		it('attempts to register if register button is clicked and email and account name are valid', function () {
			expect(false).toBeTruthy();
		});
		it('marks email as invalid if it does not contain @ and does not try to register', function () {
			expect(false).toBeTruthy();
		});
		it('marks account name as invalid if it is not 4-20 chars and only alphanumeric with', function () {
			expect(false).toBeTruthy();
		});
		it('shows registration-fail section if registration fails allowing', function () {
			expect(false).toBeTruthy();
		});
		it('shows registration-success section if registration succeeds', function () {
			expect(false).toBeTruthy();
		});
		it('fills in license-capacity, grace-period, expiry, email and payment-url when registration succeeds', function () {
			expect(false).toBeTruthy();
		});
		
	});
	describe('event logging', function () {
		it('logs stuff', function () {
			expect(false).toBeTruthy();
		});
	});
	*/
});
