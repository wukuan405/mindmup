/* global MM, jQuery, _*/
MM.GoldStorageAdapter = function (prefix, goldApi, s3Api, modalConfirmation, saveOptions) {
	'use strict';
	var self = this;
	self.list = function (showLicenseDialog) {
		var deferred = jQuery.Deferred(),
			onFileListReturned = function (fileList, account) {
				var prepend = prefix + '/' + account + '/',
					adaptItem = function (item) {
					return _.extend({id: prepend  + encodeURIComponent(item.title)}, item);
				};
				deferred.resolve(_.map(fileList, adaptItem));
			};
		goldApi.listFiles(showLicenseDialog).then(onFileListReturned, deferred.reject);
		return deferred.promise();
	};
	self.saveMap = function (contentToSave, mapId, fileName, showAuthenticationDialog) {
		var deferred = jQuery.Deferred(),
			goldMapIdComponents = function () {
				var mapIdComponents = mapId && mapId.split('/');
				if (mapIdComponents && mapIdComponents.length < 3) {
					return false;
				}
				return {
					prefix: mapIdComponents[0],
					account: mapIdComponents[1],
					fileNameKey: decodeURIComponent(mapIdComponents[2])
				};
			},
			s3FileName = function (goldMapInfo, account) {
				if (!goldMapInfo || goldMapInfo.account !== account) {
					return fileName;
				}
				return goldMapInfo.fileNameKey;
			},
			onSaveConfig = function (saveConfig, account) {
				var goldMapInfo = goldMapIdComponents(),
					s3FileNameKey = s3FileName(goldMapInfo, account),
					config = _.extend({}, saveConfig, {key: account + '/' + s3FileNameKey}),
					shouldCheckForDuplicate = function () {
						if (account === goldMapInfo.account && s3FileNameKey === goldMapInfo.fileNameKey) {
							return false;
						}
						return true;
					},
					onSaveComplete = function () {
						deferred.resolve(prefix + '/' + account + '/' + encodeURIComponent(s3FileNameKey), {editable: true});
					},
					doSave = function () {
						s3Api.save(contentToSave, config, saveOptions).then(onSaveComplete, deferred.reject);
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