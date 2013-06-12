/*global $, jQuery, document, MM, window */
MM.GithubFileSource = function () {
	'use strict';
	var self = this,
		authToken;
	self.login = function (withDialog) {
		var deferred = jQuery.Deferred(),
			popupFrame;
		if (authToken) {
			return deferred.resolve();
		}
		if (!withDialog) {
			return deferred.reject();
		}
		popupFrame = window.open('/github/login', '_blank', 'height=400,width=400,location=no,menubar=no,resizable=yes,status=no,toolbar=no');
		popupFrame.addEventListener('message', function (message) {
			console.log('from frame', message);
			if (message.data.github_token) {
				deferred.resolve(message.data.github_token).promise();
			} else if (message.data.github_error) {
				deferred.reject(message.data.github_error).promise();
			}
		});
		return deferred.promise();
	};
};
