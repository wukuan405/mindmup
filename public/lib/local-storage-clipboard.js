/*global MM*/
MM.LocalStorageClipboard = function (storage, key, alertController) {
	'use strict';
	var self = this;
	self.get = function () {
		return storage.getItem(key);
	};
	self.put = function (c) {
		try {
			storage.setItem(key, c);
		} catch (e) {
			alertController.show('Clipboard error', 'Insufficient space to copy object - saving the map might help up free up space', 'error');
		}
	};
};
