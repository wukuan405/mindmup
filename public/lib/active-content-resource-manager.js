/*global MM, _ */
MM.ActiveContentResourceManager = function (activeContentListener, prefixTemplate) {
	'use strict';
	var self = this,
		prefix = prefixTemplate + ':',
		prefixMatcher = new RegExp('^' + prefix),
		cleanUpResources = function (contentAggregate) {
			if (!contentAggregate.resources) {
				return;
			}
			var unused = {};
			_.map(contentAggregate.resources, function (value, key) {
				unused[key] = true;
			});
			contentAggregate.traverse(function (idea) {
				var url = idea && idea.attr && idea.attr.icon && idea.attr.icon.url;
				if (url) {
					delete unused[url.substring(prefix.length)];
				}
			});
			_.each(unused, function (value, key) {
				delete contentAggregate.resources[key];
			});
		};
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
	activeContentListener.addListener(function (contentAggregate, isNew) {
		if (isNew) {
			cleanUpResources(contentAggregate);
		}
	});
};
