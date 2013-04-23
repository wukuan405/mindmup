// MM.GoogleDriveWrapper = function () {
// 	'use strict';
// 	var self = this;
// 	self.saveFile = function (fileId, data) {
// 	};
// 	self.loadFile = function (fileId) {
// 	};
// 	self.retrieveAllFiles = function (searchCriteria) {
// 	};
// };

// MM.GoogleAnalyticsWrapper = function () {
// 	'use strict';
// 	var self = this;
// 	self.push = function (pushArgs) {

// 	}	
// };

var cookies = {};
// initial cut, taken from https://github.com/GoogleChrome/chrome-app-samples/blob/master/analytics/embedded_ga.js
// changed __defineGetter__, __defineGetter__ to non deprecated method calls
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

var _gaq = _gaq || [];
window.addEventListener('message', function (message) {
	'use strict';
	if (!message.data) {
		return;
	}
	var data = JSON.parse(message.data);
	if (data && data.type) {
		if (data.type === '_gaq.push') {
			console.log('message', '_gaq.push', data.args);
			_gaq.push(message.data);
		}
	}
//	
});

