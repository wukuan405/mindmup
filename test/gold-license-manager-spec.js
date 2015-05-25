/* global describe, it, expect, MM, beforeEach, jasmine */
describe('MM.GoldLicenseManager', function () {
	'use strict';
	var storage, underTest, listener,
		validFormat = '{"version":"2","accountType":"mindmup-gold","account":"dave.local","signature":"s","expiry":"1419429344"}';
	beforeEach(function () {
		storage = {
			getItem: function (s) {
				return storage[s];
			},
			setItem: jasmine.createSpy('setItem')
		};
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
		it('should accept an already parsed JSON object', function () {
			var result;
			result = underTest.storeLicense(JSON.parse(validFormat));
			expect(result).toBeTruthy();
			expect(storage.setItem).toHaveBeenCalledWith('license', JSON.parse(validFormat));
		});
		it('should reject parsed JSON that is not a license', function () {
			var result;
			result = underTest.storeLicense({a: 1});
			expect(result).toBeFalsy();
			expect(storage.setItem).not.toHaveBeenCalled();
		});
	});
	describe('completeLicenseEntry', function () {
		it('should resolve any pending deferred objects that asked for a license', function () {
			var resolved, promise;
			resolved = jasmine.createSpy();
			promise = underTest.retrieveLicense().then(resolved);
			storage.license = JSON.parse(validFormat);

			underTest.completeLicenseEntry();

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
