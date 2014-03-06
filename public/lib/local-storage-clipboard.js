/*global MM, jQuery, _, MAPJS*/
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
jQuery.fn.newFromClipboardWidget = function (clipboard, mapController) {
	'use strict';
	var elements = jQuery(this);
	elements.click(function () {
		var map = clipboard.get(),
			content;
		if (!map) {
			return;
		}
		if (_.isArray(map) && map.length > 1) {
			content = MAPJS.content(JSON.parse(JSON.stringify(MM.Maps.default)));
			content.pasteMultiple(1, map);
		} else {
			if (_.isArray(map)) {
				map = map[0];
			}
			if (map.attr && map.attr.style) {
				map.attr.style = undefined;
			}
			content = MAPJS.content(map);
		}
		mapController.setMap(content);
	});
	return elements;
};
