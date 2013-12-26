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

MM.mapIdToS3Key = function (prefix, mapId, defaultFileName, account) {
	'use strict';
	var mapIdComponents = mapId && mapId.split('/');
	if (!mapIdComponents || mapIdComponents.length < 2 || mapIdComponents[0] !== prefix || mapIdComponents[1] !== account) {
		return defaultFileName;
	}
	return decodeURIComponent(mapIdComponents[2]);
};
MM.GoldFileApi = function (license, goldApiUrl) {
	'use strict';
	this.exec = function (apiProc, args) {
		var formData = new FormData(),
			dataTypes = { 'upload': 'json' };
		formData.append('license', JSON.stringify(license));
		if (args) {
			_.each(args, function (value, key) {
				formData.append(key, value);
			});
		}
		return jQuery.ajax({
			url: goldApiUrl + '/file/' + apiProc,
			dataType: dataTypes[apiProc],
			data: formData,
			processData: false,
			contentType: false,
			type: 'POST'
		});
	};
	this.apiError = function (serverResult) {
		var recognisedErrors = {
			'invalid-license': 'not-authenticated',
			'invalid-args': 'invalid-args'
		};
		return recognisedErrors[serverResult] || 'network-error';
	};
};
MM.GoldPublishingConfigGenerator = function (licenseManager, modalConfirmation, isPrivate, couldRedirectFrom, goldApiUrl, goldBucketName) {
	'use strict';


	this.generate = function (mapId, defaultFileName, idPrefix, showAuthentication) {
		var deferred = jQuery.Deferred(),
			checkForDuplicateV1 = function (config, licenseKey) {
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
			checkForDuplicateV2 = function (config, fileToCheck, license) {
				if (mapId && (mapId[0] === idPrefix)) {
					return deferred.resolve(config);
				}
				new MM.GoldFileApi(license, goldApiUrl).exec('exists', {'file_key': fileToCheck}).then(
					function (response) {
						var list = MM.parseS3FileList('', response);
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
			generateV1Config = function (licenseKey) {
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
				checkForDuplicateV1(config, licenseKey);
			},

			generateConfig = function (license) {
				var api = new MM.GoldFileApi(license, goldApiUrl);
				api.exec('upload').then(
				function (config) {
					var fileName = MM.mapIdToS3Key(idPrefix, mapId, defaultFileName, license.account),
						result = _.extend(config, {
							'mapId': idPrefix + '/' + license.account + '/' + encodeURIComponent(fileName), //mapId
							'key': license.account + '/' + encodeURIComponent(fileName),
							's3Url': 'https://' + config.s3BucketName + '.s3.amazonaws.com/'
						});
					checkForDuplicateV2(result, encodeURIComponent(fileName), license);
				},
				function (result) {
					deferred.reject(api.apiError(result.text));
				});
			};
		handleRedirectMapId();
		licenseManager.retrieveLicense(showAuthentication).then(generateConfig, deferred.reject);
		return deferred.promise();
	};
	this.buildMapUrl = function (mapId, idPrefix, showAuthentication) {
		var deferred =  jQuery.Deferred(),
		retrieveSignature = function (license) {
			var s3key = encodeURIComponent(MM.mapIdToS3Key(idPrefix, mapId, undefined, license.account));
			new MM.GoldFileApi(license, goldApiUrl).exec('url', {'file_key': s3key}).then(
				deferred.resolve,
				deferred.reject
			);
		};
		if (isPrivate) {
			licenseManager.retrieveLicense(showAuthentication).then(
				retrieveSignature,
				deferred.reject
			);
		} else {
			deferred.resolve('https://' + goldBucketName + '.s3.amazonaws.com' + mapId.substr(idPrefix.length));
		}
		return deferred.promise();
	};
};
MM.parseS3FileList = function (prepend, httpResult, remove) {
	'use strict';
	var parsed = jQuery(httpResult),
		list = [];
	parsed.find('Contents').each(function () {
		var element = jQuery(this), fileId = element.children('Key').text();
		if (remove) {
			fileId = fileId.slice(remove);
		}
		list.push({
			id: prepend + '/' + encodeURIComponent(fileId),
			modifiedDate: element.children('LastModified').text(),
			title:  decodeURIComponent(fileId)
		});
	});
	return list;
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
			var list = MM.parseS3FileList(idPrefix + '/' + license.account, result);
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

MM.GoldStorageAdapter = function (storageAdapter, licenseManager, redirectTo, goldApiUrl) {
	'use strict';
	var originaLoadMap = storageAdapter.loadMap;
	storageAdapter.list = function (showLicenseDialog) {
		var deferred = jQuery.Deferred();
		licenseManager.retrieveLicense(showLicenseDialog).then(
			function (license) {
				new MM.GoldFileApi(license, goldApiUrl).exec('list').then(
					function (result) {
						var list = MM.parseS3FileList(storageAdapter.prefix + '/' + license.account, result, license.account.length + 1);
						deferred.resolve(list);
					},
					deferred.reject);
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
					deferred.resolve(publishingConfig.mapId, _.extend(publishingConfig, properties));
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

MM.S3FilePoller = function (sleepPeriod, timeoutPeriod) {
	'use strict';
	this.poll = function (signedListUrl, stoppedSemaphore) {
		var sleepTimeoutId,
			timeoutId,
			deferred = jQuery.Deferred(),
			shouldPoll = function () {
				return deferred && !(stoppedSemaphore && stoppedSemaphore());
			},
			execRequest = function () {
				var setSleepTimeout = function () {
					if (shouldPoll()) {
						sleepTimeoutId = window.setTimeout(execRequest, sleepPeriod);
					}
				};
				if (shouldPoll()) {
					jQuery.ajax({
						url: signedListUrl,
						timeout: sleepPeriod,
						method: 'GET'
					}).then(function success(result) {
						var key = jQuery(result).find('Contents Key').first().text();
						if (deferred && key) {
							window.clearTimeout(timeoutId);
							deferred.resolve(key);
						} else {
							setSleepTimeout();
						}
					}, setSleepTimeout);
				} else {
					window.clearTimeout(timeoutId);
				}
			},
			cancelRequest = function () {
				if (shouldPoll()) {
					deferred.reject('polling-timeout');
				}
				window.clearTimeout(sleepTimeoutId);
				deferred = undefined;
			};
		if (shouldPoll()) {
			timeoutId = window.setTimeout(cancelRequest, timeoutPeriod);
			execRequest();
		}
		return deferred.promise();
	};
};
