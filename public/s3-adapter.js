/*jslint forin: true*/
/*global FormData, jQuery, MM, observable */
MM.AjaxPublishingConfigGenerator = function (publishingConfigUrl, folder) {
	'use strict';
	this.generate = function () {
		var deferred = jQuery.Deferred();
		jQuery.ajax(
			publishingConfigUrl,
			{ dataType: 'json', cache: false }
		).then(
			deferred.resolve,
			deferred.reject.bind(deferred, 'network-error')
		);
		return deferred.promise();
	};
	this.mapUrl = function (mapId) {
		return folder + mapId + '.json';
	};
};
MM.GoldLicenseManager = function (storage, storageKey) {
	'use strict';
	var self = this,
		currentDeferred;
	observable(this);
	this.getLicense = function () {
		return storage.getItem(storageKey);
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
	this.storeLicense = function (license) {
		storage.setItem(storageKey, license);
		if (currentDeferred) {
			currentDeferred.resolve(license);
			currentDeferred = undefined;
		}
	};
	this.removeLicense = function () {
		storage.setItem(storageKey, undefined);
	};
	this.cancelLicenseEntry = function () {
		if (currentDeferred) {
			currentDeferred.reject('user-cancel');
			currentDeferred = undefined;
		}
	};
};
jQuery.fn.goldLicenseEntryWidget = function (licenseManager) {
	'use strict';
	var self = this,
		input = self.find('textarea'),
		controlGroup = self.find('.control-group'),
		commit = self.find('[data-mm-role=commit]'),
		remove = self.find('[data-mm-role=remove]');
	self.on('show', function () {
		controlGroup.removeClass('error');
		input.val('');
	});
	self.on('shown', function () {
		var existing = licenseManager.getLicense();
		input.val(existing && JSON.stringify(existing));
		input.focus();
	});
	self.on('hidden', function () {
		licenseManager.cancelLicenseEntry();
		remove.show();
	});
	self.find('form').submit(function () {
		commit.click();
		return false;
	});
	remove.click(function () {
		licenseManager.removeLicense();
	});
	commit.click(function () {
		var licenseText = input.val();
		if (!licenseText) {
			controlGroup.addClass('error');
			return false;
		}
		try {
			licenseManager.storeLicense(JSON.parse(licenseText));
		} catch (e) {
			controlGroup.addClass('error');
			return false;
		}
		self.modal('hide');
	});
	licenseManager.addEventListener('license-entry-required', function () {
		remove.hide();
		self.modal('show');
	});
	return self;
};
MM.GoldPublishingConfigGenerator = function (licenseManager, modalConfirmation) {
	'use strict';
	var self = this;
	this.generate = function (mapId, defaultFileName, idPrefix, showAuthentication) {
		var deferred = jQuery.Deferred(),
			checkForDuplicate = function (config) {
				if (mapId && mapId[0] === idPrefix) {
					return deferred.resolve(config);
				}
				var mapUrl = 'http://' + config.s3BucketName + '.s3.amazonaws.com/' +  config.key;
				jQuery.ajax({
					url: mapUrl,
					type: 'GET'
				}).then(
					function () {
						modalConfirmation.showModalToConfirm('Confirm saving',
							'There is already a file with that name in your cloud storage. Please confirm that you want to overwrite it, or cancel and rename the map before saving',
							'Overwrite',
							function () {
								deferred.resolve(config);
							});
					},
					function (err) {
						if (err.status === 404) {
							deferred.resolve(config);
						} else {
							deferred.reject('network-error');
						}
					}
				);
//				deferred.resolve(config);
			},
			generateConfig = function (licenseKey) {
				var buildFileName = function (prefix, mapId, fileName) {
						var mapIdComponents = mapId && mapId.split('/');
						if (!mapIdComponents || mapIdComponents.length < 2 || mapIdComponents[0] !== prefix || mapIdComponents[1] !== licenseKey.account) {
							return fileName;
						}
						return decodeURIComponent(mapIdComponents[2]);
					},
					fileName = buildFileName(idPrefix, mapId, defaultFileName),
					config = {
						's3UploadIdentifier': idPrefix + '/' + licenseKey.account + '/' + encodeURIComponent(fileName),
						'key': licenseKey.account + '/' + fileName,
						's3BucketName' : licenseKey.accountType,
						'Content-Type': 'text/plain',
						'AWSAccessKeyId' : licenseKey.id,
						'policy': licenseKey.policy,
						'signature': licenseKey.signature
					};
				checkForDuplicate(config);
			};
		licenseManager.retrieveLicense(showAuthentication).then(generateConfig, deferred.reject);
		return deferred.promise();
	};
	this.mapUrl = function (mapId, idPrefix) {
		return mapId.substr(idPrefix.length + 1);
	};
};
MM.S3Adapter = function (s3Url, publishingConfigGenerator, prefix, description) {
	'use strict';
	var properties = {editable: true};
	this.description = description;

	this.recognises = function (mapId) {
		return mapId && mapId[0] === prefix;
	};

	this.loadMap = function (mapId) {
		var deferred = jQuery.Deferred(),
			onMapLoaded = function (result) {
				deferred.resolve(result, mapId, 'application/json', properties);
			},
			mapUrl = s3Url + publishingConfigGenerator.mapUrl(mapId, prefix);
		jQuery.ajax(
			mapUrl,
			{ dataType: 'json', success: onMapLoaded, error: deferred.reject }
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
				formData.append('acl', 'public-read');
				formData.append('Content-Type', 'text/plain');
				formData.append('file', contentToSave);
				jQuery.ajax({
					url: s3Url,
					type: 'POST',
					processData: false,
					contentType: false,
					data: formData
				}).done(function () {
					deferred.resolve(publishingConfig.s3UploadIdentifier, properties);
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
		publishingConfigGenerator.generate(mapId, fileName, prefix, showAuthenticationDialog, s3Url).then(
			submitS3Form,
			deferred.reject
		);
		return deferred.promise();
	};
};
