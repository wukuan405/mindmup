/*global MM, window, jQuery, localStorage*/
MM.BrowserContainer = function () {
	'use strict';
	var self = this;
	self.bindUnloadEvent = function (onOnUnload) {
		jQuery(window).bind('beforeunload', onOnUnload);
	};
	self.storage = {
		removeItem: function (key) {
			localStorage.removeItem(key);
		},
		setItem: function (key, value) {
			var deferred = jQuery.Deferred();
			try {
        localStorage.setItem(key, value);
        deferred.resolve();
      } catch (e) {
        deferred.reject(e);
      };
      return deferred.promise();
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
