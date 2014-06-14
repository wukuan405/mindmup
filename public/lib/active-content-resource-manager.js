/*global MM */
MM.ActiveContentResourceManager = function (activeContentListener, prefix) {
	'use strict';
	var self = this,
		prefixMatcher = new RegExp('^' + prefix + ':');
	self.storeResource = function (resourceURL) {
		return prefix + ':' + activeContentListener.getActiveContent().storeResource(resourceURL);
	};
	self.getResource = function (resourceURL) {
		if (prefixMatcher.test(resourceURL)) {
			return activeContentListener.getActiveContent().getResource(resourceURL.substring(prefix.length + 1));
		} else {
			return resourceURL;
		}
	};
};
