/*global MM, $, jQuery, _*/

MM.gaqProxy = function (bridge, earlyEvents) {
	'use strict';
	var self = this;
	self.push = function (values) {
		bridge.postMessage(JSON.stringify({type: '_gaq.push', args: values}), '*');
	};
	for (var i in earlyEvents) {
		self.push(earlyEvents[i]);
	}
};

MM.googleDrivePlaceholder = function () {
	'use strict';
	var self = this,
		calls = [],
		promiseCall = function (type, args) {
			var deferred = jQuery.Deferred();
			calls.push({type: type, args: args, deferred: deferred});
			return deferred.promise();
		};

	self.save = function () {
		return promiseCall('save', arguments);
	};
	self.load = function () {
		return promiseCall('load', arguments);
	};
	self.list = function () {
		return promiseCall('list', arguments);
	};
	self.applyTo = function (proxy) {
		_.each(calls, function (call) {
			if (call && call.type && proxy[call.type]) {
				proxy[call.type].apply(proxy, call.args).then(call.deferred.resolve, call.deferred.reject);
			}
		});
	};
};
MM.googleDriveProxy = function (bridge) {
	'use strict';
	var self = this,
		promises = {};

	self.save = function (fileId, data) {
		var type = 'gdrive.save',
			deferred = jQuery.Deferred();
		promises[type] = deferred;
		bridge.postMessage(JSON.stringify({type: type, args: [fileId, data]}), '*');
		return deferred.promise();
	};
	self.load = function (fileId) {
		var type = 'gdrive.load',
			deferred = jQuery.Deferred();
		promises[type] = deferred;
		bridge.postMessage(JSON.stringify({type: type, args: [fileId]}), '*');
		return deferred.promise();
	};
	self.list = function (searchCriteria) {
		var type = 'gdrive.list',
			deferred = jQuery.Deferred();
		promises[type] = deferred;
		bridge.postMessage(JSON.stringify({type: type, args: [searchCriteria]}), '*');
		return deferred.promise();
	};
	window.addEventListener('message', function (message) {
		if (message.origin && message.origin !== 'null' && window.location.origin !== message.origin) {
			return;
		}
		if (!message.data) {
			return;
		}
		var data = JSON.parse(message.data);
		if (data && data.type) {
			var deferred = promises[data.type];
			if (deferred) {
				delete promises[data.type];
				if (data.error) {
					deferred.reject(data.error);
				}
				else {
					deferred.resolve(data.result);
				}
			}
		}
	});
};

MM.googleProxyInstall = function (namespace, targetElementSelector) {
	'use strict';
	var installAnalyticsProxy = function (bridge) {
			var earlyEvents = namespace._gaq || [];

			namespace._gaq = new MM.gaqProxy(bridge, earlyEvents);
		},
		installGdriveProxy = function (bridge) {
			var placeHolder = MM.gdrive || {};
			MM.gdrive = new MM.googleDriveProxy(bridge);
			if (placeHolder && placeHolder.applyTo) {
				placeHolder.applyTo(MM.gdrive);
			}
		},
		installProxies = function () {
			var proxyTarget = $(targetElementSelector),
				bridge = proxyTarget && proxyTarget[0] && proxyTarget[0].contentWindow;
			if (!bridge) {
				return;
			}
			installAnalyticsProxy(bridge);
			installGdriveProxy(bridge);
		};
	MM.gdrive = new MM.googleDrivePlaceholder();
	window.addEventListener('load', installProxies);
};
