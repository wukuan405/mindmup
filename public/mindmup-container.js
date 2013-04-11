/*global MM, window, jQuery, chrome*/
MM.BrowserContainer = function () {
	'use strict';
	var self = this;
	self.bindUnloadEvent = function (onOnUnload) {
		jQuery(window).bind('beforeunload', onOnUnload);
	},
	self.storage = function () {
		return {
			removeItem: function (key) {
				localStorage.removeItem(key);
			},
			setItem: function (key, value) {
				localStorage.setItem(key, value);
			},
			getItem: function (key) {
				var deferred = jQuery.Deferred();
				return deferred.resolve(localStorage.getItem(key)).promise();
			}
		};
	};
	self.classCachingWidget = function (element, keyPrefix, store) {
		var key = keyPrefix + '-' + element.selector;
		store = store || localStorage;
		jQuery(window).unload(function () {
			store[key] = element.attr('class');
		});
		element.addClass(store[key]);
		return this;
	};
	return self;
};

MM.ChromeAppContainer = function () {
	'use strict';
	var self = this,
		storage = chrome.storage.local;
	this.bindUnloadEvent = function () {
	},
	this.classCachingWidget = function () {
	};
	this.storage = function () {
		return {
			removeItem: function (key) {
				storage.remove(key);
			},
			setItem: function (key, value) {
				var val = {};
				val[key] = value;
				storage.set(val);
			},
			getItem: function (key) {
				var deferred = jQuery.Deferred();
				storage.get(key, function (result) {
					deferred.resolve(result);
				});
				return deferred.promise();
			}
		};
	};
	return self;
};