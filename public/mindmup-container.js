/*global MM, window, jQuery, chrome*/
MM.BrowserContainer = function () {
	'use strict';
	var self = this;
	self.bindUnloadEvent = function (onOnUnload) {
		jQuery(window).bind('beforeunload', onOnUnload);
	},
	self.storage = {
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
		storage = chrome && chrome.storage && chrome.storage.local;
	self.bindUnloadEvent = function () {
	};
	self.classCachingWidget = function (element, keyPrefix, store) {
		var key = keyPrefix + '-' + element.selector, observer;
			store = store || self.storage;
			observer = new MutationObserver(function(mutations) {
				store.setItem(key,  element.attr('class'));
			});
		$.each(element, function () {
			observer.observe(this, { attributes: true, childList: false, characterData: false });
		});
		store.getItem(key).done(function(result) {
			element.attr('class', result);
		});
		return this;
	};
	this.storage = {
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
					deferred.resolve(result[key]);
				});
				return deferred.promise();
			}
		};
	return self;
};
