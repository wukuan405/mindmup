/* global MM, jQuery, FormData, _ */
MM.GoldApi = function (goldLicenseManager, goldApiUrl, activityLog, goldBucketName) {
	'use strict';
	var self = this,
		currentOnetimePassword,
		currentIdentifier,
		LOG_CATEGORY = 'GoldApi',
		apiError = function (serverResult) {
			var recognisedErrors = ['not-authenticated', 'invalid-args', 'server-error', 'user-exists', 'email-exists'];
			if (_.contains(recognisedErrors, serverResult)) {
				return serverResult;
			}
			return 'network-error';
		},
		licenseExec = function (apiProc, showLicenseDialog, args, expectedAccount) {
			var deferred = jQuery.Deferred(),
				onLicenceRetrieved = function (license) {
					var execArgs = _.extend({}, args, {'license': JSON.stringify(license)});
					if (expectedAccount && expectedAccount !== license.account) {
						deferred.reject('not-authenticated');
					} else {
						self.exec(apiProc, execArgs).then(
							function (httpResult) {
								deferred.resolve(httpResult, license.account);
							},
							deferred.reject);
					}
				};
			goldLicenseManager.retrieveLicense(showLicenseDialog).then(onLicenceRetrieved, deferred.reject);
			return deferred.promise();
		};
	self.exec = function (apiProc, args) {
		var deferred = jQuery.Deferred(),
			rejectWithError = function (jxhr) {
				var result = jxhr.responseText;
				activityLog.log(LOG_CATEGORY, 'error', apiProc + ':' + result);
				deferred.reject(apiError(result));
			},
			timer  = activityLog.timer(LOG_CATEGORY, apiProc);
		var formData = new FormData(),
			dataTypes = { 'license/register': 'json', 'file/export_config': 'json', 'file/upload_config': 'json', 'file/echo_config': 'json', 'license/subscription': 'json', 'license/request_license_using_code': 'json'};
		formData.append('api_version', '2');
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
	self.register = function (accountName, email) {
		var result = jQuery.Deferred();
		self.exec('license/register', {'to_email': email, 'account_name' : accountName})
			.then(function (jsonResponse) {
				if (jsonResponse.license) {
					goldLicenseManager.storeLicense(jsonResponse.license);
				}
				result.resolve(jsonResponse);
			},
			result.reject,
			result.notify);
		return result.promise();
	};
	self.getSubscription = function () {
		var license = goldLicenseManager.getLicense();
		return self.exec('license/subscription', {'license': JSON.stringify(license)});
	};
	self.cancelSubscription = function () {
		var license = goldLicenseManager.getLicense();
		return self.exec('license/cancel_subscription', {'license': JSON.stringify(license)});
	};
	self.generateExportConfiguration = function (format) {
		var license = goldLicenseManager.getLicense();
		return self.exec('file/export_config', {'license': JSON.stringify(license), 'format': format});
	};
	self.generateEchoConfiguration = function (format, contentType) {
		var license = goldLicenseManager.getLicense();
		return self.exec('file/echo_config', {'license': JSON.stringify(license), 'format': format, 'contenttype': contentType});
	};
	self.requestCode = function (identifier) {
		currentOnetimePassword = MM.onetimePassword();
		currentIdentifier = identifier;
		return self.exec('license/request_code', {'identifier': identifier, 'one_time_pw': currentOnetimePassword});
	};
	self.restoreLicenseWithCode = function (code) {
		var deferred = jQuery.Deferred();
		if (currentOnetimePassword && currentIdentifier) {
			self.exec('license/request_license_using_code', {'identifier': currentIdentifier, 'one_time_pw': currentOnetimePassword, 'code': code}).then(
				function (license) {
					goldLicenseManager.storeLicense(license);
					deferred.resolve();
				},
				deferred.reject);
		} else {
			deferred.reject('no-code-requested');
		}
		return deferred.promise();
	};
	self.listFiles = function (showLicenseDialog) {
		var deferred = jQuery.Deferred(),
			onListReturned = function (httpResult, account) {
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
				deferred.resolve(list, account);
			};
		licenseExec('file/list', showLicenseDialog).then(onListReturned, deferred.reject);
		return deferred.promise();
	};
	self.generateSaveConfig = function (showLicenseDialog) {
		return licenseExec('file/upload_config', showLicenseDialog);
	};
	self.fileUrl = function (showAuthenticationDialog, account, fileNameKey, signedUrl) {
		if (signedUrl) {
			return licenseExec('file/url', showAuthenticationDialog, {'file_key': encodeURIComponent(fileNameKey)}, account);
		} else {
			return jQuery.Deferred().resolve('https://' + goldBucketName + '.s3.amazonaws.com/' + account + '/' + encodeURIComponent(fileNameKey)).promise();
		}

	};
	self.exists = function (fileNameKey) {
		var deferred = jQuery.Deferred(),
			license = goldLicenseManager.getLicense();
		if (license) {
			self.exec('file/exists', {'license': JSON.stringify(license), 'file_key': encodeURIComponent(fileNameKey)}).then(
				function (httpResult) {
					var parsed = jQuery(httpResult);
					deferred.resolve(parsed.find('Contents').length > 0);
				},
				deferred.reject
				);
		} else {
			deferred.reject('not-authenticated');
		}
		return deferred.promise();
	};
};
MM.onetimePassword = function () {
	'use strict';
	var s4 = function () {
		var rand = (1 + Math.random());
		return ((rand * 0x10000) || 0).toString(16).substring(1);
	};

	return s4() + '-' + s4();
};