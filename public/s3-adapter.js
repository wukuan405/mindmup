/*jslint forin: true*/
/*global FormData, jQuery, MM, observable, window, _*/
MM.AjaxPublishingConfigGenerator = function (s3Url, publishingConfigUrl, folder, additionalArgumentsGenerator) {
	'use strict';
	this.generate = function () {
		var deferred = jQuery.Deferred(),
			options = {
				url: publishingConfigUrl,
				dataType: 'json',
				type: 'POST',
				processData: false,
				contentType: false
			},
			generatorArgs = additionalArgumentsGenerator && additionalArgumentsGenerator();
		if (generatorArgs) {
			options.data =  new FormData();
			_.each(generatorArgs, function (val, key) { options.data.append(key, val); });
		}
		jQuery.ajax(options).then(
			function (jsonConfig) {
				jsonConfig.s3Url = s3Url;
				jsonConfig.mapId = jsonConfig.s3UploadIdentifier;
				deferred.resolve(jsonConfig);
			},
			deferred.reject.bind(deferred, 'network-error')
		);
		return deferred.promise();
	};
	this.buildMapUrl = function (mapId) {
		return jQuery.Deferred().resolve(s3Url + folder + mapId + '.json').promise();
	};
};
MM.GoldLicenseManager = function (storage, storageKey, signatureUrl) {
	'use strict';
	var self = this,
		currentDeferred;
	observable(this);
	this.getLicense = function () {
		return storage.getItem(storageKey);
	};
	this.goldLicenseIdentifiers = function () {
		var license = self.getLicense(),
			generated;
		if (license && license.key && license.id) {
			generated =  _.pick(license, 'id', 'key');
		}
		return generated;
	};
	this.retrieveLicense = function (showAuthentication) {
		currentDeferred = undefined;
		if (!showAuthentication && this.getLicense()) {
			return jQuery.Deferred().resolve(this.getLicense()).promise();
		}
		currentDeferred = jQuery.Deferred();
		self.dispatchEvent('license-entry-required');
		return currentDeferred.promise();
	};
	this.retieveFileSignature = function (s3Key, license) {
		var deferred = jQuery.Deferred(),
			formData = new FormData();
		formData.append('key', license.key);
		formData.append('filename', s3Key);
		formData.append('id', license.id);
		formData.append('account', license.account);

		jQuery.ajax({
			url: signatureUrl,
			dataType: 'json',
			data: formData,
			processData: false,
			contentType: false,
			type: 'POST'
		}).then(
			deferred.resolve,
			deferred.reject.bind(deferred, 'network-error')
		);
		return deferred.promise();
	};
	this.storeLicense = function (license) {
		var deferred = currentDeferred;
		storage.setItem(storageKey, license);
		if (currentDeferred) {
			currentDeferred = undefined;
			deferred.resolve(license);
		}
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
MM.mapIdToS3Key = function (prefix, mapId, defaultFileName, account) {
	'use strict';
	var mapIdComponents = mapId && mapId.split('/');
	if (!mapIdComponents || mapIdComponents.length < 2 || mapIdComponents[0] !== prefix || mapIdComponents[1] !== account) {
		return defaultFileName;
	}
	return decodeURIComponent(mapIdComponents[2]);
};
MM.GoldPublishingConfigGenerator = function (licenseManager, modalConfirmation, isPrivate, couldRedirectFrom) {
	'use strict';
	this.generate = function (mapId, defaultFileName, idPrefix, showAuthentication) {
		var deferred = jQuery.Deferred(),
			checkForDuplicate = function (config, licenseKey) {
				if (mapId && (mapId[0] === idPrefix)) {
					return deferred.resolve(config);
				}
				MM.ajaxS3List(licenseKey, idPrefix, config.key).then(
					function (list) {
						if (list && list.length) {
							modalConfirmation.showModalToConfirm(
								'Confirm saving',
								'There is already a file with that name in your cloud storage. Please confirm that you want to overwrite it, or cancel and rename the map before saving',
								'Overwrite'
							).then(
								deferred.resolve.bind(deferred, config),
								deferred.reject.bind(deferred, 'user-cancel')
							);
						} else {
							deferred.resolve(config);
						}
					},
					deferred.reject
				);
			},
			handleRedirectMapId = function () {
				if (mapId && mapId[0] === couldRedirectFrom) {
					mapId = idPrefix + mapId.slice(1);
				}
			},
			generateConfig = function (licenseKey) {
				if (isPrivate && !licenseKey.key) {
					deferred.reject('not-authenticated');
					return;
				}
				var fileName = MM.mapIdToS3Key(idPrefix, mapId, defaultFileName, licenseKey.account),
					config = {
						'mapId': idPrefix + '/' + licenseKey.account + '/' + encodeURIComponent(fileName), //mapId
						'key': fileName,
						's3BucketName' : 'mindmup-' + licenseKey.account,
						'Content-Type': 'text/plain',
						'AWSAccessKeyId' : licenseKey.id,
						'policy': licenseKey.policy,
						'signature': licenseKey.signature,
						's3Url': 'https://mindmup-' + licenseKey.account + '.s3.amazonaws.com/'
					};
				checkForDuplicate(config, licenseKey);
			};
		handleRedirectMapId();
		licenseManager.retrieveLicense(showAuthentication).then(generateConfig, deferred.reject);
		return deferred.promise();
	};
	this.buildMapUrl = function (mapId, idPrefix, showAuthentication) {
		var deferred =  jQuery.Deferred(),
		retrieveSignature = function (license) {
			var s3key = encodeURIComponent(MM.mapIdToS3Key(idPrefix, mapId, undefined, license.account));
			licenseManager.retieveFileSignature(s3key, license).then(
				function (signatures) {
					var url = 'https://mindmup-' + license.account + '.s3.amazonaws.com/' + s3key +  '?&AWSAccessKeyId=' + license.id + '&Signature=' + signatures.get + '&Expires=' + signatures.expiry;
					deferred.resolve(url);
				},
				deferred.reject
			);
		};
		if (isPrivate) {
			licenseManager.retrieveLicense(showAuthentication).then(
				retrieveSignature,
				deferred.reject
			);
		} else {
			deferred.resolve('https://mindmup-' + mapId.substr(idPrefix.length + 1).replace(/\//, '.s3.amazonaws.com/'));
		}
		return deferred.promise();
	};
};
MM.ajaxS3List = function (license, idPrefix, searchPrefix) {
	'use strict';
	var deferred = jQuery.Deferred(),
		url = 'https://mindmup-' + license.account + '.s3.amazonaws.com/?&AWSAccessKeyId=' + license.id + '&Signature=' + license.list + '&Expires=' + license.expiry;
	if (searchPrefix) {
		url = url + '&prefix=' + encodeURIComponent(searchPrefix);
	}
	jQuery.ajax({
		url: url,
		type: 'GET'
	}).then(
		function (result) {
			var parsed = jQuery(result),
				list = [];
			parsed.find('Contents').each(function () {
				var element = jQuery(this);
				list.push({
					id: idPrefix + '/' + license.account + '/' + encodeURIComponent(element.children('Key').text()),
					modifiedDate: element.children('LastModified').text(),
					title:  decodeURIComponent(element.children('Key').text())
				});
			});
			deferred.resolve(list);
		},
		function (err) {
			deferred.reject(MM.s3AjaxErrorReason(err, true));
		}
	);
	return deferred.promise();
};
MM.s3AjaxErrorReason = function (err, isAuthenticated) {
	'use strict';
	var reason = 'network-error';
	if (err.status === 404 || err.status === 403) {
		reason = isAuthenticated ? 'not-authenticated' :'map-not-found';
	}
	return reason;
};

MM.GoldStorageAdapter = function (storageAdapter, licenseManager, redirectTo) {
	'use strict';
	var originaLoadMap = storageAdapter.loadMap;
	storageAdapter.list = function (showLicenseDialog) {
		var deferred = jQuery.Deferred();
		licenseManager.retrieveLicense(showLicenseDialog).then(
			function (license) {
				MM.ajaxS3List(license, storageAdapter.prefix).then(deferred.resolve, deferred.reject);
			},
			deferred.reject
		);
		return deferred.promise();
	};
	storageAdapter.loadMap = function (mapId, showAuthentication) {
		var deferred = jQuery.Deferred();
		originaLoadMap(mapId, showAuthentication).then(
			deferred.resolve,
			function (reason) {
				if (reason === 'map-not-found' && redirectTo) {
					deferred.reject('map-load-redirect', redirectTo + mapId.slice(1));
				} else  {
					deferred.reject(reason);
				}
			}
		);
		return deferred.promise();
	};
	return storageAdapter;
};
MM.S3Adapter = function (publishingConfigGenerator, prefix, description, isPrivate) {
	'use strict';

	var properties = {editable: true},
		savePolicy = isPrivate ? 'bucket-owner-read' : 'public-read';
	this.description = description;
	this.prefix = prefix;
	this.recognises = function (mapId) {
		return mapId && mapId[0] === prefix;
	};
	this.loadMap = function (mapId, showAuthentication) {
		var deferred = jQuery.Deferred(),
			onMapLoaded = function (result) {
				deferred.resolve(result, mapId, 'application/json', properties);
			};
		publishingConfigGenerator.buildMapUrl(mapId, prefix, showAuthentication).then(
			function (mapUrl) {
				jQuery.ajax(
					mapUrl, { dataType: 'json', cache: false}).then(
					onMapLoaded,
					function (err) {
						deferred.reject(MM.s3AjaxErrorReason(err, isPrivate));
					});
			},
			deferred.reject
		);
		return deferred.promise();
	};
	this.saveMap = function (contentToSave, mapId, fileName, showAuthenticationDialog) {
		var deferred = jQuery.Deferred(),
			submitS3Form = function (publishingConfig) {
				var formData = new FormData();
				['key', 'AWSAccessKeyId', 'policy', 'signature'].forEach(function (parameter) {
					formData.append(parameter, publishingConfig[parameter]);
				});
				formData.append('acl', savePolicy);
				formData.append('Content-Type', 'text/plain');
				formData.append('file', contentToSave);
				jQuery.ajax({
					url: publishingConfig.s3Url,
					type: 'POST',
					processData: false,
					contentType: false,
					data: formData
				}).done(function () {
					deferred.resolve(publishingConfig.mapId, properties);
				}).fail(function (evt) {
					var errorReason = 'network-error',
						errorLabel = (evt && evt.responseText) || 'network-error',
						errorReasonMap = { 'EntityTooLarge': 'file-too-large' },
						errorDoc;
					if (evt.status === 403) {
						deferred.reject('failed-authentication');
						return;
					}
					try {
						errorDoc = evt && (evt.responseXML || jQuery.parseXML(evt.responseText));
						if (errorDoc) {
							errorReason = jQuery(errorDoc).find('Error Code').text() || errorReason;
							errorLabel = jQuery(errorDoc).find('Error Message').text() || errorLabel;
						}
					} catch (e) {
						// just ignore, the network error is set by default
					}
					deferred.reject(errorReasonMap[errorReason] || errorReason, errorLabel);
				});
			};
		publishingConfigGenerator.generate(mapId, fileName, prefix, showAuthenticationDialog).then(
			submitS3Form,
			deferred.reject
		);
		return deferred.promise();
	};

};

MM.S3FilePoller = function (bucket, prefix, postfix, sleepPeriod, timeoutPeriod) {
	'use strict';
	var bucketUrl = 'http://' + bucket + '.s3.amazonaws.com/';
	this.poll = function (fileId) {
		var sleepTimeoutId,
			timeoutId,
			deferred = jQuery.Deferred(),
			execRequest = function () {
				var setSleepTimeout = function () {
					if (!deferred) {
						return;
					}
					sleepTimeoutId = window.setTimeout(execRequest, sleepPeriod);
				};
				jQuery.ajax({
					url: bucketUrl + '?prefix=' + encodeURIComponent(prefix + fileId + postfix) + '&max-keys=1',
					method: 'GET'
				}).then(function success(result) {
					var key = jQuery(result).find('Contents Key').first().text();
					if (deferred && key) {
						window.clearTimeout(timeoutId);
						deferred.resolve(bucketUrl + key);
					} else {
						setSleepTimeout();
					}
				}, setSleepTimeout);
			},
			cancelRequest = function () {
				window.clearTimeout(sleepTimeoutId);
				deferred.reject('polling-timeout');
				deferred = undefined;
			};
		timeoutId = window.setTimeout(cancelRequest, timeoutPeriod);
		execRequest();
		return deferred.promise();
	};
};
