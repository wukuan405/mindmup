/*global window, webkit, MM*/
MM.IOS = MM.IOS || {};
MM.IOS.Proxy = function (listenerName) {
	'use strict';
	var self = this,
			listener,
			onHashChange = function () {
				var windowHash = window && window.location && window.location.hash,
						decodedHash = decodeURIComponent(windowHash) || windowHash;
				if (listener && decodedHash.length > 1) {
					try {
						listener(JSON.parse(decodedHash.slice(1)));
					} catch (err) {
						listener(decodedHash.slice(1));
					}
				}
			};
	self.sendMessage = function () {
		try {
			var args = Array.prototype.slice.call(arguments, 0);
			if (!args || args.length === 0) {
				return;
			}
			if (args.length > 1) {
				webkit.messageHandlers[listenerName].postMessage(JSON.parse(JSON.stringify(args)));
			} else {
				webkit.messageHandlers[listenerName].postMessage(JSON.parse(JSON.stringify(args[0])));
			}
		} catch (err) {
			//unable to send message
		}
	};
	self.onCommand = function (newListener) {
		listener = newListener;
	};
	window.console.log = function () {
		var args = Array.prototype.slice.call(arguments, 0);
		self.sendMessage({'type': 'log', 'args': args});
	};
	window.onerror = function errorHandler() {
		try {
			var args = Array.prototype.slice.call(arguments, 0);
			self.sendMessage({'type': 'error', 'args': args});
		} catch (err) {
			//unable to send error
		}
		return false;
	};
	window.addEventListener('hashchange', onHashChange);
};


