var MM = MM || {};
MM.DeferredSkeleton = function (objectMap, target) {
	'use strict';
	var self = this,
		onMessage = function (message) {
		if (message.origin && message.origin !== 'null' && window.location.origin !== message.origin) {
			return;
		}
		if (message.data && message.data.content &&  message.data.content.name && message.data.content.method) {
			var args = message.data.content.args || [],
				obj = objectMap[message.data.content.name],
				promise,
				reply = function (type) {
					return function () {
						message.source.postMessage({id: message.data.id, type: type, content: Array.prototype.slice.call(arguments)}, '*');
					};
				};
			if (!obj) {
				reply('reject')('No Object Found');
				return;
			}
			if (!obj[message.data.content.method]) {
				reply('reject')('No Method Found');
				return;
			}
			try {
				promise = obj[message.data.content.method].apply(obj, args);
				if (!promise || !promise.then) {
					var content = [];
					if (promise) {
						content.push(promise);
					}
					message.source.postMessage({id: message.data.id, type: 'resolve', content: content}, '*');
				} else {
					promise.then(reply('resolve'), reply('reject'), reply('notify'));
				}
			} catch (e) {
				reply('reject')(JSON.stringify(e));
			}
		}
	};
	target.addEventListener('message', onMessage);
	self.targetUnloaded = function () {
		if (target) {
			target.removeEventListener('message', onMessage);
		}
	};
};
