/*global MM, jQuery, XMLHttpRequest*/
MM.ajaxBlobFetch = function (url) {
	'use strict';
	// jQuery ajax does not support binary transport yet
	var http = new XMLHttpRequest(),
			result = jQuery.Deferred();

	http.addEventListener('load', function () {
		if (http.status === 200) {
			result.resolve(http.response, http.getResponseHeader('content-type'));
		} else {
			result.reject(http, http.statusText, http.status);
		}
	});
	http.addEventListener('error', function () {
		result.reject(http, http.statusText, http.status);
	});
	http.addEventListener('abort', function () {
		result.reject(http, http.statusText, http.status);
	});
	http.addEventListener('progress', function (oEvent) {
		if (oEvent.lengthComputable) {
			result.notify(Math.round((oEvent.loaded * 100) / oEvent.total, 2) + '%');
		} else {
			result.notify();
		}
	});
	http.open('GET', url, true);
	http.responseType = 'blob';
	http.send();
	return result.promise();
};
