/*global MM, observable*/

MM.IOS.ServerConnector = function (goldLicenseManager, serverConfig, activityLog) {
	'use strict';
	var self = observable(this),
		setGoldApi = function () {
			self.goldApi = new MM.GoldApi(goldLicenseManager, serverConfig.valueForKey('goldApiUrl'), activityLog, serverConfig.valueForKey('goldBucketName'));
		};
	setGoldApi();
	serverConfig.addEventListener('config:set', function () {
		setGoldApi();
		self.dispatchEvent('serverConnectorChanged');
	});
	self.s3Api = new MM.S3Api();
};
