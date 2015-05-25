/*global MM, describe, it, beforeEach, expect, jasmine*/

describe('MM.IOS.ServerConfig', function () {
	'use strict';
	var underTest, licenseManager;
	beforeEach(function () {
		licenseManager = jasmine.createSpyObj('licenseManager', ['storeLicense', 'removeLicense']);
		underTest = new MM.IOS.LicenseCommandHandler(licenseManager);
	});
	describe('handlesCommand', function () {
		it('returns true if command.type is license:set', function () {
			expect(underTest.handlesCommand({type: 'license:set'})).toBeTruthy();
		});
		it('returns false if command.type is undefined', function () {
			expect(underTest.handlesCommand({typeo: 'license:set'})).toBeFalsy();
		});
		it('returns false if command type is undefined', function () {
			expect(underTest.handlesCommand()).toBeFalsy();
		});
		it('returns false if command.type is not license:set', function () {
			expect(underTest.handlesCommand({type: 'foo:bar'})).toBeFalsy();
		});
	});
	describe('handleCommand', function () {
		it('should store the license if supplied as the first arg', function () {
			underTest.handleCommand({type: 'foo:bar', args:['areallicense']});
			expect(licenseManager.storeLicense).toHaveBeenCalledWith('areallicense');
		});
		it('should remove the license if no args supplied', function () {
			underTest.handleCommand({type: 'foo:bar'});
			expect(licenseManager.removeLicense).toHaveBeenCalled();
		});
		it('should remove the license if args are empty', function () {
			underTest.handleCommand({type: 'foo:bar', args:[]});
			expect(licenseManager.removeLicense).toHaveBeenCalled();
		});
		it('should remove the license if args are undefined', function () {
			underTest.handleCommand({type: 'foo:bar', args:undefined});
			expect(licenseManager.removeLicense).toHaveBeenCalled();
		});
		it('should remove the license if first arg is false', function () {
			underTest.handleCommand({type: 'foo:bar', args:[false]});
			expect(licenseManager.removeLicense).toHaveBeenCalled();
		});
	});
});
