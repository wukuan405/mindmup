/*jslint forin: true*/
/*global FormData, jQuery, MM */
MM.AjaxPublishingConfigGenerator = function (publishingConfigUrl, folder) {
	'use strict';
	this.generate = function () {
		return jQuery.ajax(
			publishingConfigUrl,
			{ dataType: 'json', cache: false }
		).promise();
	};
	this.mapUrl = function (mapId) {
		return folder + mapId + '.json';
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
			mapUrl = s3Url + publishingConfigGenerator.mapUrl(mapId);
		jQuery.ajax(
			mapUrl,
			{ dataType: 'json', success: onMapLoaded, error: deferred.reject }
		);
		return deferred.promise();
	};
	this.saveMap = function (contentToSave, mapId, fileName) {
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
		publishingConfigGenerator.generate(mapId, fileName).then(
			submitS3Form,
			deferred.reject.bind(deferred, 'network-error')
		);
		return deferred.promise();
	};
};
