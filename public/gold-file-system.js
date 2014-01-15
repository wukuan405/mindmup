/* global MM, jQuery, _*/

MM.GoldStorage = function (goldApi, s3Api, modalConfirmation, options) {
	'use strict';
	var self = this,
		isRelatedPrefix = function (mapPrefix) {
			return mapPrefix && options && options[mapPrefix];
		};
	self.list = function (showLicenseDialog) {
		var deferred = jQuery.Deferred(),
			onFileListReturned = function (fileList, account) {
				var prepend = options.listPrefix + '/' + account + '/',
					adaptItem = function (item) {
					return _.extend({id: prepend  + encodeURIComponent(item.title)}, item);
				};
				deferred.resolve(_.map(fileList, adaptItem));
			};
		goldApi.listFiles(showLicenseDialog).then(onFileListReturned, deferred.reject);
		return deferred.promise();
	};
	self.saveMap = function (prefix, contentToSave, mapId, fileName, showAuthenticationDialog) {
		var deferred = jQuery.Deferred(),
			goldMapIdComponents = function () {
				var mapIdComponents = mapId && mapId.split('/');
				if (mapIdComponents && mapIdComponents.length < 3) {
					return false;
				}
				if (!isRelatedPrefix(mapIdComponents[0])) {
					return false;
				}
				return {
					prefix: mapIdComponents[0],
					account: mapIdComponents[1],
					fileNameKey: decodeURIComponent(mapIdComponents[2])
				};
			},
			s3FileName = function (goldMapInfo, account) {
				if (goldMapInfo && goldMapInfo.fileNameKey &&  goldMapInfo.account === account) {
					return goldMapInfo.fileNameKey;
				}
				return fileName;

			},
			onSaveConfig = function (saveConfig, account) {
				var goldMapInfo = goldMapIdComponents(),
					s3FileNameKey = s3FileName(goldMapInfo, account),
					config = _.extend({}, saveConfig, {key: account + '/' + s3FileNameKey}),
					shouldCheckForDuplicate = function () {
						if (!goldMapInfo || account !== goldMapInfo.account) {
							return true;
						}
						return false;
					},
					onSaveComplete = function () {
						deferred.resolve(prefix + '/' + account + '/' + encodeURIComponent(s3FileNameKey), {editable: true});
					},
					doSave = function () {
						s3Api.save(contentToSave, config, options[prefix]).then(onSaveComplete, deferred.reject);
					},
					doConfirm = function () {
						modalConfirmation.showModalToConfirm(
							'Confirm saving',
							'There is already a file with that name in your gold storage. Please confirm that you want to overwrite it, or cancel and rename the map before saving',
							'Overwrite'
						).then(
							doSave,
							deferred.reject.bind(deferred, 'user-cancel')
						);
					},
					checkForDuplicate = function () {
						goldApi.exists(s3FileNameKey).then(
							function (exists) {
								if (exists) {
									doConfirm();
								} else {
									doSave();
								}
							},
							deferred.reject
						);
					};
				if (shouldCheckForDuplicate()) {
					checkForDuplicate();
				} else {
					doSave();
				}

			};

		goldApi.generateSaveConfig(showAuthenticationDialog).then(onSaveConfig, deferred.reject);

		return deferred.promise();
	};
};