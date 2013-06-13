/*global $, jQuery, document, MM, window */
MM.GithubFileSystem = function () {
	'use strict';
	var self = this,
		authToken,
		toGithubFileId = function (mapId) {
			return mapId.slice(1);
		},
		loadFile = function (githubId) {
			return jQuery.Deferred().reject("Unsupported").promise();
		},
		saveFile = function (contentToSave, mapId, fileName) {
			return jQuery.Deferred().reject("Unsupported").promise();
		},
		properties = {editable: true, sharable: true};
	self.prefix = 'h';
	self.login = function (withDialog) {
		var deferred = jQuery.Deferred(),
			popupFrame;
		if (authToken) {
			return deferred.resolve();
		}
		if (!withDialog) {
			return deferred.reject('not-authenticated');
		}
		popupFrame = window.open('/github/login', '_blank', 'height=400,width=700,location=no,menubar=no,resizable=yes,status=no,toolbar=no');
		popupFrame.addEventListener('message', function (message) {
			if (message && message.data && message.data.github_token) {
				authToken = message.data.github_token;
				deferred.resolve();
			} else if (message && message.data && message.data.github_error) {
				deferred.reject('failed-authentication', message.data.github_error);
			}
		});
		return deferred.promise();
	};
	self.recognises = function (mapId) {
		return mapId && mapId[0] === self.prefix;
	};
	self.description = "GitHub";
	this.loadMap = function (mapId, showAuthenticationDialogs) {
		var deferred = jQuery.Deferred(),
			githubId = toGithubFileId(mapId),
			readySucceeded = function () {
				loadFile(githubId).then(
					function (content, mimeType) {
						deferred.resolve(content, mapId, mimeType, properties);
					},
					deferred.reject
				).progress(deferred.notify);
			};
		this.login(showAuthenticationDialogs).then(readySucceeded, deferred.reject, deferred.notify);
		return deferred.promise();
	};

	this.saveMap = function (contentToSave, mapId, fileName, showAuthenticationDialogs) {
		var deferred = jQuery.Deferred();
		this.login(showAuthenticationDialogs).then(
			function () {
				saveFile(contentToSave, mapId, fileName).then(deferred.resolve, deferred.reject, deferred.notify);
			},
			deferred.reject
		).progress(deferred.notify);
		return deferred.promise();
	};
};
MM.Extensions.GitHub = function () {
	'use strict';
	var fileSystem = new MM.GithubFileSystem(),
		mapController = MM.Extensions.components.mapController,
		loadUI = function (html) {
			$('[data-mm-role=save] ul').append($(html).find('[data-mm-role=save-link]'));
		};
	mapController.addMapSource(new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(fileSystem)));
	mapController.validMapSourcePrefixesForSaving += fileSystem.prefix;

	$.get('/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/github.html', loadUI);
	$('<link rel="stylesheet" href="/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/github.css" />').appendTo($('body'));

};
MM.Extensions.GitHub();
