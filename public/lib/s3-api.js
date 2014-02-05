/*global jQuery, MM, FormData, window, _*/

MM.S3Api = function () {
	'use strict';
	var self = this;
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
	self.pollerDefaults = {sleepPeriod: 1000, timeoutPeriod: 20000};
	self.poll = function (signedListUrl, options) {
		var sleepTimeoutId,
			timeoutId,
			deferred = jQuery.Deferred(),
			shouldPoll = function () {
				return deferred && !(options.stoppedSemaphore && options.stoppedSemaphore());
			},
			execRequest = function () {
				var setSleepTimeout = function () {
					if (shouldPoll()) {
						options.sleepTimeoutId = window.setTimeout(execRequest, options.sleepPeriod);
					}
				};
				if (shouldPoll()) {
					jQuery.ajax({
						url: signedListUrl,
						timeout: options.sleepPeriod,
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
		options = _.extend(self.pollerDefaults, options);

		if (shouldPoll()) {
			timeoutId = window.setTimeout(cancelRequest, options.timeoutPeriod);
			execRequest();
		}
		return deferred.promise();
	};
	self.loadUrl = function  (url) {
		var deferred = jQuery.Deferred();
		jQuery.ajax(
			url, { cache: false}).then(
			deferred.resolve,
			function (err) {
				if (err.status === 404 || err.status === 403) {
					deferred.reject('map-not-found');
				} else {
					deferred.reject('network-error');
				}

			});
		return deferred.promise();
	};
};