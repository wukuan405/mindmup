/*global MM, window, jQuery, localStorage*/
MM.BrowserContainer = function () {
	'use strict';
	var self = this;
	self.bindUnloadEvent = function (onOnUnload) {
		jQuery(window).bind('beforeunload', onOnUnload);
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
