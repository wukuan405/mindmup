/*global jQuery, MM, FormData*/

MM.S3Api = function () {
	'use strict';
	this.save = function (contentToSave, saveConfiguration, options) {
		var formData = new FormData(),
			savePolicy = options && options.isPrivate ? 'bucket-owner-read' : 'public-read',
			deferred = jQuery.Deferred(),
			saveFailed = function (evt) {
				var errorReasonMap = { 'EntityTooLarge': 'file-too-large' },
					errorDoc,
					errorReason,
					errorLabel;
				if (evt.status === 403) {
					deferred.reject('failed-authentication');
					return;
				}
				try {
					errorDoc = evt && (evt.responseXML || jQuery.parseXML(evt.responseText));
					errorReason = jQuery(errorDoc).find('Error Code').text();
				} catch (e) {
					// just ignore, the network error is set by default
				}
				if (!errorReason) {
					deferred.reject('network-error');
					return;
				}
				errorLabel = jQuery(errorDoc).find('Error Message').text();

				deferred.reject(errorReasonMap[errorReason], errorLabel);
			};

		['key', 'AWSAccessKeyId', 'policy', 'signature'].forEach(function (parameter) {
			formData.append(parameter, saveConfiguration[parameter]);
		});
		formData.append('acl', savePolicy);
		formData.append('Content-Type', 'text/plain');
		formData.append('file', contentToSave);
		jQuery.ajax({
			url: 'https://' + saveConfiguration.s3BucketName + '.s3.amazonaws.com/',
			type: 'POST',
			processData: false,
			contentType: false,
			data: formData
		}).then(deferred.resolve, saveFailed);
		return deferred.promise();
	};
};
