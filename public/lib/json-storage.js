/*global _, observable, jQuery, MM*/
MM.JsonStorage = function (storage) {
	'use strict';
    var self = this;
	self.setItem = function (key, value) {
		return storage.setItem(key, JSON.stringify(value));
	};
	self.getItem = function (key) {
		var item = storage.getItem(key);
		try {
			return JSON.parse(item);
		} catch (e) {
		}
	};
	self.remove = function (key) {
		storage.removeItem(key);
	};
};
