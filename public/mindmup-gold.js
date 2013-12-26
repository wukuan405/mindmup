/* global MM, observable, jQuery, FormData, _ */
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
MM.GoldApi = function (goldLicenseManager, goldApiUrl, activityLog) {
	'use strict';
	var self = this,
		LOG_CATEGORY = 'GoldApi',
		apiError = function (serverResult) {
			var recognisedErrors = ['not-authenticated', 'invalid-args', 'server-error', 'user-exists', 'email-exists'];
			if (_.contains(recognisedErrors, serverResult)) {
				return serverResult;
			}
			return 'network-error';
		};
	this.exec = function (apiProc, args) {
		var deferred = jQuery.Deferred(),
			rejectWithError = function (jxhr) {
				var result = jxhr.responseText;
				activityLog.log(LOG_CATEGORY, 'error', apiProc + ':' + result);
				deferred.reject(apiError(result));
			};
		activityLog.log(LOG_CATEGORY, apiProc);
		var formData = new FormData(),
			dataTypes = { 'register': 'json' };
		if (args) {
			_.each(args, function (value, key) {
				formData.append(key, value);
			});
		}
		jQuery.ajax({
			url: goldApiUrl + '/' + apiProc,
			dataType: dataTypes[apiProc],
			data: formData,
			processData: false,
			contentType: false,
			type: 'POST'
		}).then(
			deferred.resolve,
			rejectWithError);
		return deferred.promise();
	};
	this.register = function (accountName, email) {
		return self.exec('register', {'to_email': email, 'account_name' : accountName});
	};
};
