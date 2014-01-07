/* global describe, it, expect, MM, beforeEach, jasmine, jQuery, spyOn, window, afterEach */
describe('MM.GoldLicenseManager', function () {
	'use strict';
	var storage, underTest, listener;
	beforeEach(function () {
		storage = { getItem: function (s) { return storage[s]; }, setItem: jasmine.createSpy('setItem') };
		underTest = new MM.GoldLicenseManager(storage, 'license');
		listener = jasmine.createSpy('listener');
		underTest.addEventListener('license-entry-required', listener);
	});
	describe('getLicense', function () {

		it('should return the license from the storage', function () {
			storage.license = {a: 'b'};
			expect(underTest.getLicense()).toEqual({a: 'b'});
		});
		it('should return false if there is no license in the storage', function () {
			expect(underTest.getLicense()).toBeFalsy();
		});
	});
	describe('retrieveLicense', function () {
		it('should resolve immediately if there is a license in the storage and authentication is not forced', function () {
			storage.license = {a: 'b'};
			var resolved, promise;
			resolved = jasmine.createSpy();
			promise = underTest.retrieveLicense().then(resolved);
			expect(promise.state()).toEqual('resolved');
			expect(resolved).toHaveBeenCalledWith({a: 'b'});
			expect(listener).not.toHaveBeenCalled();
		});
		it('should return a promise and fire the license-entry-required event if no license in storage', function () {
			var promise;
			promise = underTest.retrieveLicense();
			expect(promise.state()).toEqual('pending');
			expect(listener).toHaveBeenCalled();
		});
		it('should return a promise and fire the license-entry-required event if there is a license in storage but authentication is forced', function () {
			storage.license = {a: 'b'};
			var promise = underTest.retrieveLicense(true);
			expect(promise.state()).toEqual('pending');
			expect(listener).toHaveBeenCalled();
		});
	});
	describe('storeLicense', function () {
		var validFormat = '{"version":"2","accountType":"mindmup-gold","account":"dave.local","signature":"s","expiry":"1419429344"}';
		it('should set the current license from a JSON string', function () {
			var result;
			result = underTest.storeLicense(validFormat);
			expect(result).toBeTruthy();
			expect(storage.setItem).toHaveBeenCalledWith('license', JSON.parse(validFormat));
		});
		it('should reject invalid JSON', function () {
			var result;
			result = underTest.storeLicense('sdiufhufh');
			expect(result).toBeFalsy();
			expect(storage.setItem).not.toHaveBeenCalled();
		});
		it('should reject JSON that is not a license', function () {
			var result;
			result = underTest.storeLicense(JSON.stringify({a: 1}));
			expect(result).toBeFalsy();
			expect(storage.setItem).not.toHaveBeenCalled();
		});
		it('should resolve any pending deferred objects that asked for a license', function () {
			var resolved, promise;
			resolved = jasmine.createSpy();
			promise = underTest.retrieveLicense().then(resolved);

			underTest.storeLicense(validFormat);

			expect(promise.state()).toEqual('resolved');
			expect(resolved).toHaveBeenCalledWith(JSON.parse(validFormat));
		});
	});
	describe('cancelLicenseEntry', function () {
		it('should reject any pending deferred objects that asked for a license with user-cancel', function () {
			var rejected, promise;
			rejected = jasmine.createSpy();
			promise = underTest.retrieveLicense().fail(rejected);
			underTest.cancelLicenseEntry();

			expect(promise.state()).toEqual('rejected');
			expect(rejected).toHaveBeenCalledWith('user-cancel');
		});
	});
});
describe('MM.GoldApi', function () {
	'use strict';
	var goldLicenseManager, underTest, activityLog, oldFormData, ajaxDeferred, license, endSpy;
	beforeEach(function () {
		ajaxDeferred = jQuery.Deferred();
		spyOn(jQuery, 'ajax').andReturn(ajaxDeferred.promise());

		goldLicenseManager = {getLicense: function () {}};
		license = {version: '2', accountType: 'mindmup-gold', account: 'test', signature: 'validsignature'};
		spyOn(goldLicenseManager, 'getLicense').andReturn(license);

		activityLog = { log: jasmine.createSpy(), timer: jasmine.createSpy()};
		endSpy = jasmine.createSpy();

		activityLog.timer.andReturn({end: endSpy});
		underTest = new MM.GoldApi(goldLicenseManager, 'API_URL', activityLog);
		oldFormData = window.FormData;
		window.FormData = function () {
			this.params = {};
			this.append = function (key, value) {
				this.params[key] = value;
			};
		};
	});
	afterEach(function () {
		window.FormData = oldFormData;
	});
	describe('getExpiry', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.getExpiry();
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
			expect(ajaxPost.url).toEqual('API_URL/license/expiry');
			expect(ajaxPost.dataType).toBeUndefined();
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license)});
		});
	});
	describe('register', function () {

		it('posts an AJAX request to the API url', function () {
			underTest.register('test_name', 'test_email');
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
			expect(ajaxPost.url).toEqual('API_URL/license/register');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.data.params).toEqual({'to_email' : 'test_email', 'account_name' : 'test_name'});
		});
	});
	describe('exec', function () {
		var execArgs, result, resolved, rejected;
		beforeEach(function () {
			resolved = jasmine.createSpy();
			rejected = jasmine.createSpy();
			execArgs = {'name': 'test_name'};
			result = underTest.exec('entity/action', execArgs).then(resolved, rejected);
		});
		it('posts an AJAX request to the API url', function () {
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
			expect(ajaxPost.url).toEqual('API_URL/entity/action');
			expect(ajaxPost.data.params).toEqual(execArgs);
			expect(ajaxPost.type).toEqual('POST');
		});

		it('returns a pending promise, waiting on ajax to resolve', function () {
			expect(result.state()).toBe('pending');
		});
		it('resolves with the parsed JSON when ajax resolves', function () {
			ajaxDeferred.resolve({'a': 'b'});
			expect(resolved).toHaveBeenCalledWith({'a': 'b'});
			expect(endSpy).toHaveBeenCalled();
		});
		it('rejects with the error reason if one of known errors', function () {
			ajaxDeferred.reject({responseText: 'invalid-args'});
			expect(rejected).toHaveBeenCalledWith('invalid-args');
			expect(endSpy).toHaveBeenCalled();
		});
		it('rejects with network-error if not a known error', function () {
			ajaxDeferred.reject({responseText: 'invalid-error'});
			expect(rejected).toHaveBeenCalledWith('network-error');
			expect(endSpy).toHaveBeenCalled();
		});
		it('starts the timer when request starts', function () {
			expect(activityLog.timer).toHaveBeenCalledWith('GoldApi', 'entity/action');
			expect(endSpy).not.toHaveBeenCalled();
		});
		it('logs actual failure', function () {
			ajaxDeferred.reject({responseText: 'invalid-error'});
			expect(activityLog.log).toHaveBeenCalledWith('GoldApi', 'error', 'entity/action:invalid-error');
			expect(endSpy).toHaveBeenCalled();
		});
	});
	describe('generateExportConfiguration', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.generateExportConfiguration('pdf');
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
			expect(ajaxPost.url).toEqual('API_URL/file/export_config');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license), 'format': 'pdf'});
		});
	});
});
