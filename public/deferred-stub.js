/*global MM, jQuery, _*/

MM.DeferredStub = function (targetSelector) {
	'use strict';
	var self = this,
		target,
		nextId = 1,
		deferred = {},
		delayedMessages = [],
		onMessageFromTarget = function (message) {
			self.callCount ++;
			if (message.origin && message.origin !== 'null' && window.location.origin !== message.origin) {
				return;
			}
			if (message.data && message.data.type && message.data.id && deferred[message.data.id]) {
				var content = message.data.content || [];
				deferred[message.data.id][message.data.type].apply(deferred, content);
				if (deferred[message.data.id].state() !== 'pending') {
					delete deferred[message.data.id];
				}
			}
		};
	self.pendingPromises = function () {
		return _.size(deferred);
	};
	self.postMessage = function (message) {
		var id = nextId++;
		deferred[id] = jQuery.Deferred();
    deferred[id]._originalMessage = message;
		if (target) {
			target.postMessage({id: id, content: message}, '*');
		} else {
			delayedMessages.push({id: id, content: message});
		}
		return deferred[id].promise();
	};
	self.targetLoaded = function () {
		var container = jQuery(targetSelector)[0];
		target = container && container.contentWindow;
		if (target) {
			window.addEventListener('message', onMessageFromTarget);
			_.each(delayedMessages, function (msg) {
				target.postMessage(msg, '*');
			});
			delayedMessages = [];
		}
	};
	self.targetUnloaded = function () {
		if (target) {
			window.removeEventListener('message', onMessageFromTarget);
			target = undefined;
		}
	};
};

MM.deferredStubProxy = function (objectToExtend, name, deferredStub, methods) {
	'use strict';
	_.each(methods, function (method) {
		objectToExtend[method] = function () {
			return deferredStub.postMessage({name: name, method: method, args: _.toArray(arguments)});
		};
	});
	return objectToExtend;
};

