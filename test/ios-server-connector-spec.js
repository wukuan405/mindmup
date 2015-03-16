/*global describe, beforeEach, MM, jasmine, observable, spyOn, it, expect*/
describe('MM.IOS.ServerConnector', function () {
	'use strict';
	var underTest, goldLicenseManager, serverConfig, activityLog, config, changedListener;
	beforeEach(function () {
		config = {
			goldApiUrl: 'foo',
			goldBucketName: 'bar'
		};
		changedListener = jasmine.createSpy('changedListener');
		spyOn(MM, 'GoldApi').and.callThrough();
		goldLicenseManager = jasmine.createSpyObj('goldLicenseManager', ['retrieveLicense']);
		serverConfig = observable({
			valueForKey: function (key) {
				return config[key];
			}
		});
		activityLog = jasmine.createSpyObj('activityLog', ['log']);
		underTest = new MM.IOS.ServerConnector(goldLicenseManager, serverConfig, activityLog);
		underTest.addEventListener('serverConnectorChanged', changedListener);
	});
	describe('initialization', function () {
		it('should set up a goldApi with config values', function () {
			expect(MM.GoldApi).toHaveBeenCalledWith(goldLicenseManager, 'foo', activityLog, 'bar');
		});
	});
	describe('handling config:set event', function () {
		beforeEach(function () {
			MM.GoldApi.calls.reset();
			config.goldApiUrl = 'foo1';
			config.goldBucketName = 'bar1';
			serverConfig.dispatchEvent('config:set');
		});
		it('should recreate goldApi', function () {
			expect(MM.GoldApi).toHaveBeenCalledWith(goldLicenseManager, 'foo1', activityLog, 'bar1');
		});
		it('should dispatch serverConnectorChanged event', function () {
			expect(changedListener).toHaveBeenCalled();
		});
	});

});
