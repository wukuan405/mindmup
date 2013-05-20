/*global jQuery, MM, _, location, window */
MM.Extensions = function (storage, storageKey, cachePreventionKey) {
	'use strict';
	var active = [];
	if (storage[storageKey]) {
		active = storage[storageKey].split(' ');
	}
	this.scriptsToLoad = function () {
		return _.map(_.reject(_.map(active, function (ext) {
			return MM.Extensions.config[ext] && MM.Extensions.config[ext].script;
		}), function (e) { return !e; }), function (script) { return script + "?v=" + cachePreventionKey; });
	};
	this.isActive = function (ext) {
		return _.contains(active, ext);
	};
	this.setActive = function (ext, shouldActivate) {
		if (shouldActivate) {
			active = _.union(active, [ext]);
		} else {
			active = _.without(active, ext);
		}
		storage[storageKey] = active.join(' ');
		if (window._gaq) {
			window._gaq.push(['_setCustomVar', 2, 'Active Extensions', active.join(' '), 1], ['_trackEvent', 'Extensions', ext, shouldActivate]);
		}
	};
};
MM.Extensions.config = {
	'goggle-collaboration' : {
		name: 'Realtime collaboration',
		script: '/e/google-collaboration.js'
	}
};
jQuery.fn.extensionsWidget = function (extensions, mapController, alert) {
	'use strict';
	var element = this,
		listElement = element.find('[data-mm-role=ext-list]'),
		template = listElement.find('[data-mm-role=template]').hide().clone(),
		changed = false,
		causedByMapId;
	_.each(MM.Extensions.config, function (ext, extkey) {
		var item = template.clone().appendTo(listElement).show();
		item.find('[data-mm-role=title]').text(ext.name);
		item.find('input[type=checkbox]').attr('checked', extensions.isActive(extkey)).change(function () {
			extensions.setActive(extkey, this.checked);
			changed = true;
		});
	});
	element.on('hidden', function () {
		if (changed) {
			if (!causedByMapId) {
				location.reload();
			} else {
				location.replace("?#m:" + causedByMapId);
			}
		}
		causedByMapId = undefined;
	});

	mapController.addEventListener('mapSourceExtensionRequired', function (newMapId) {
		var showAlertWithCallBack = function (message, prompt, type, callback) {
			var alertId = alert.show(
				message,
				'<a href="#" data-mm-role="alert-callback">' + prompt + '</a>',
				type
			);
			jQuery('[data-mm-role=alert-callback]').click(function () {
				alert.hide(alertId);
				callback();
			});
		};
		showAlertWithCallBack(
			'This map requires an extension to load',
			'Click here to configure extensions',
			'warning',
			function () {
				causedByMapId = newMapId;
				element.modal('show');
			}
		);
	});
	return element;
};


