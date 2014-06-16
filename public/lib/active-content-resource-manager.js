/*global MM */
/* todo:
 * - protect against false cache hits when a map is reloaded (eg instert an index of map loaded in front of every resource)
 * - collab maps - transfer resources
 */
MM.ActiveContentResourceManager = function (activeContentListener, prefixTemplate) {
	'use strict';
	var self = this,
		prefix = prefixTemplate + ':',
		prefixMatcher = new RegExp('^' + prefix),
		folder,
		buildUniqueString = function () {
			return 'xxxxxxxx-yxxx-yxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});
		};
	activeContentListener.addListener(function (content, isNew) {
		if (isNew) {
			folder = buildUniqueString() + '/';
		}
	});
	self.storeResource = function (resourceURL) {
		return prefix + folder + activeContentListener.getActiveContent().storeResource(resourceURL);
	};
	self.getResource = function (resourceURL) {
		if (prefixMatcher.test(resourceURL)) {
			return activeContentListener.getActiveContent().getResource(resourceURL.substring(prefix.length));
		} else {
			return resourceURL;
		}
	};
};
