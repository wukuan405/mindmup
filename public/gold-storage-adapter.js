/* global MM, jQuery, _*/
MM.GoldStorageAdapter = function (prefix, goldApi) {
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
};