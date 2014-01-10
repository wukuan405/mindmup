/* global MM, jQuery, FormData, _ */
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
			},
			timer  = activityLog.timer(LOG_CATEGORY, apiProc);
		var formData = new FormData(),
			dataTypes = { 'license/register': 'json', 'file/export_config': 'json'};
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
		}).then(deferred.resolve, rejectWithError).always(timer.end);
		return deferred.promise();
	};
	this.register = function (accountName, email) {
		return self.exec('license/register', {'to_email': email, 'account_name' : accountName});
	};
	this.getExpiry = function () {
		var license = goldLicenseManager.getLicense();
		return self.exec('license/expiry', {'license': JSON.stringify(license)});
	};
	this.generateExportConfiguration = function (format) {
		var license = goldLicenseManager.getLicense();
		return self.exec('file/export_config', {'license': JSON.stringify(license), 'format': format});
	};
	this.listFiles = function (showLicenseDialog) {
		var deferred = jQuery.Deferred(),
			onLicenceRetrieved = function (license) {
				var onListReturned = function (httpResult) {
					var parsed = jQuery(httpResult),
						list = [];
					parsed.find('Contents').each(function () {
						var element = jQuery(this),
							key = element.children('Key').text(),
							remove = key.indexOf('/') + 1;
						list.push({
							modifiedDate: element.children('LastModified').text(),
							title:  key.slice(remove)
						});

					});
					deferred.resolve(list, license.account);
				};
				self.exec('file/list', {'license': JSON.stringify(license)}).then(onListReturned, deferred.reject);
			};
		goldLicenseManager.retrieveLicense(showLicenseDialog).then(onLicenceRetrieved, deferred.reject);
		return deferred.promise();
	};
};