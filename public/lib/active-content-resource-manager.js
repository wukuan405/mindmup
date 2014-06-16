/*global MM */
/* todo:
 * - embedded maps config
 * - protect against false cache hits when a map is reloaded (eg instert an index of map loaded in front of every resource)
 * - collab maps - transfer resources
 */
MM.ActiveContentResourceManager = function (activeContentListener, prefixTemplate) {
	'use strict';
	var self = this,
		index = 0,
		prefixMatcher,
		prefix,
		buildPrefixMatcher = function () {
			index++;
			prefix = prefixTemplate + ':' + index + ':';
			prefixMatcher = new RegExp('^' + prefix);
		};
	activeContentListener.addListener(function (content, isNew) {
		if (isNew) {
			buildPrefixMatcher();
		}
	});
	self.storeResource = function (resourceURL) {
		return prefix + activeContentListener.getActiveContent().storeResource(resourceURL);
	};
	self.getResource = function (resourceURL) {
		if (prefixMatcher.test(resourceURL)) {
			return activeContentListener.getActiveContent().getResource(resourceURL.substring(prefix.length));
		} else {
			return resourceURL;
		}
	};
};
