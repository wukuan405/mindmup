var MM = MM || {},
	cookies = {},
	_gaq = _gaq || [],
	gdrive,
	messageHandlers = {
		'_gaq.push': function (args) {
			'use strict';
			_gaq.push(args);
		},
		'gdrive.load': function (args, message) {
			'use strict';
			args.push(message);
			gdrive.load.apply(gdrive, args);
		},
		'gdrive.save': function (args, message) {
			'use strict';
			args.push(message);
			gdrive.save.apply(gdrive, args);
		},
		'gdrive.list': function (args, message) {
			'use strict';
			args.push(message);
			gdrive.list.apply(gdrive, args);
		}
	};

MM.TinyDef = function () {
	'use strict';
	var self = this,
		resolveFunc, resolveArgs,
		rejectFunc, rejectArgs,
		notifyFunc, notifyArgs,
		doApply = function (func, args) {
			if (func && args) {
				func.apply(func, args);
			}
		};
	self.promise = function () {
		return {
			then: self.then,
			progress: self.progress
		};
	};
	self.then = function (onResolve, onReject) {
		resolveFunc = onResolve;
		rejectFunc = onReject;
		doApply(resolveFunc, resolveArgs);
		doApply(rejectFunc, rejectArgs);
	};
	self.resolve = function () {
		resolveArgs = arguments;
		doApply(resolveFunc, resolveArgs);
	};
	self.reject = function () {
		rejectArgs = arguments;
		doApply(rejectFunc, rejectArgs);
	};
	self.notify = function () {
		notifyArgs = arguments;
		doApply(notifyFunc, notifyArgs);
	};
	self.progress = function (onProgress) {
		notifyFunc = onProgress;
		doApply(notifyFunc, notifyArgs);
	};
};

MM.GoogleDriveWrapper = function () {
	'use strict';
	var self = this;
	self.save = function (fileId, data, event) {
		event.source.postMessage(JSON.stringify({type: 'gdrive.save', result: {id: fileId}}), event.origin);
	};
	self.load = function (fileId, event) {
		event.source.postMessage(JSON.stringify({type: 'gdrive.load', result: {title: 'foo'}}), event.origin);
	};
	self.list = function (searchCriteria, event) {
		event.source.postMessage(JSON.stringify({type: 'gdrive.save', result: ['foo', 'bar']}), event.origin);
	};
};
gdrive = new MM.GoogleDriveWrapper();
Object.defineProperty(document, 'cookie', {
	get: function () {
		'use strict';
		var result = [];
		for (var cookie in cookies) {
			result.push(cookie + '=' + cookies[cookie]);
		}
		return result.join('; ');
	},
	set: function (value) {
		'use strict';
		if (value.indexOf(';') < 0) {
			return;
		}
		var cookieName = value.substring(0, value.indexOf('=')),
			cookieValue = value.substring(cookieName.length + 1, value.indexOf(';'));
		cookies[cookieName] = cookieValue;
	}
});

Object.defineProperty(history, 'length', {get: function () {
	'use strict';
	return 0;
}});

window.addEventListener('message', function (message) {
	'use strict';
	if (message.origin && message.origin !== 'null' && window.location.origin !== message.origin) {
		return;
	}
	if (!message.data) {
		return;
	}
	var data = JSON.parse(message.data);
	if (data && data.type && messageHandlers[data.type]) {
		messageHandlers[data.type](data.args, message);
	}
//	
});

