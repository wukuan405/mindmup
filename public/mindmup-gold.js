/* global MM, observable, jQuery */
MM.GoldLicenseManager = function (storage, storageKey) {
	'use strict';
	var self = this,
		currentDeferred,
		validFormat = function (license) {
			return license && license.accountType === 'mindmup-gold';
		};
	observable(this);
	this.getLicense = function () {
		return storage.getItem(storageKey);
	};
	this.goldLicenseIdentifiers = function () {
		throw 'License format changed, fix me';
/*		var license = self.getLicense(),
			generated;
		if (license && license.key && license.id) {
			generated =  _.pick(license, 'id', 'key');
		}
		return generated;
		*/
	};
	this.retrieveLicense = function (forceAuthentication) {
		currentDeferred = undefined;
		if (!forceAuthentication && this.getLicense()) {
			return jQuery.Deferred().resolve(this.getLicense()).promise();
		}
		currentDeferred = jQuery.Deferred();
		self.dispatchEvent('license-entry-required');
		return currentDeferred.promise();
	};
	this.storeLicense = function (licenseString) {
		var deferred = currentDeferred, license;
		try {
			license = JSON.parse(licenseString);
		} catch (e) {
			return false;
		}
		if (!validFormat(license)) {
			return false;
		}

		storage.setItem(storageKey, license);
		if (currentDeferred) {
			currentDeferred = undefined;
			deferred.resolve(license);
		}
		return true;
	};
	this.removeLicense = function () {
		storage.setItem(storageKey, undefined);
	};
	this.cancelLicenseEntry = function () {
		var deferred = currentDeferred;
		if (currentDeferred) {
			currentDeferred = undefined;
			deferred.reject('user-cancel');
		}
	};
};

