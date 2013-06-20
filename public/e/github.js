/*global $, _, jQuery, document, MM, window, sessionStorage */
MM.GithubFileSystem = function () {
	'use strict';
	var self = this,
		SESSION_AUTH_CACHE_KEY = 'github_auth_token',
		authToken = function () {
			return window.sessionStorage && window.sessionStorage[SESSION_AUTH_CACHE_KEY];
		},
		setAuthToken = function (tokenString) {
			if (!window.sessionStorage) { // fake it
				window.sessionStorage = {};
			}
			window.sessionStorage[SESSION_AUTH_CACHE_KEY] = tokenString;
		},
		toGithubFileId = function (mapId) {
			return mapId.slice(1);
		},
		loadFile = function (githubId) {
			return jQuery.Deferred().reject("Unsupported").promise();
		},
		saveFile = function (contentToSave, mapId, fileName) {
			return jQuery.Deferred().reject("Unsupported").promise();
		},
		properties = {editable: true, sharable: true},
		sendRequest = function (url) {
			var baseUrl = 'https://api.github.com',
				request_type = 'GET';
			if (!authToken()) {
				return jQuery.Deferred().reject('not-authenticated').promise();
			}
			return jQuery.ajax({
				url: baseUrl + url,
				type: request_type,
				headers: {'Authorization': 'bearer ' + authToken()}
			});
		},
		repoParser = function (githubData) {
			return {
				type: 'repo',
				name: githubData.full_name,
				defaultBranch: githubData.default_branch
			};
		},
		filesAndDirsParser = function (githubData) {
			return _.pick(githubData, ['type', 'name', 'path']);
		};
	self.prefix = 'h';
	self.login = function (withDialog) {
		var deferred = jQuery.Deferred(),
			popupFrame;
		if (authToken()) {
			return deferred.resolve();
		}
		if (!withDialog) {
			return deferred.reject('not-authenticated');
		}
		popupFrame = window.open('/github/login', '_blank', 'height=400,width=700,location=no,menubar=no,resizable=yes,status=no,toolbar=no');
		popupFrame.addEventListener('message', function (message) {
			if (message && message.data && message.data.github_token) {
				setAuthToken(message.data.github_token);
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
	this.getRepositories = function () {
		var deferred = jQuery.Deferred();
		sendRequest('/user/repos').then(
			function (result) {
				deferred.resolve(_.map(result, repoParser));
			},
			deferred.reject,
			deferred.notify
		);
		return deferred.promise();
	};
	this.getFiles = function (repository, branch, path) {
		var deferred = jQuery.Deferred(),
			url = '/repos/' + repository + '/contents/' + path;
		if (branch) {
			url = url + "?ref=" + branch;
		}
		sendRequest(url).then(
			function (result) {
				deferred.resolve(_.map(result, filesAndDirsParser));
			},
			deferred.reject,
			deferred.notify
		);
		return deferred.promise();
	};
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
$.fn.githubOpenWidget = function (fileSystem, mapController) {
	'use strict';
	var modal = this,
		template = this.find('[data-mm-role=template]'),
		fileList = template.parent(),
		statusDiv = this.find('[data-mm-role=status]'),
		showAlert = function (message, type, detail, callback) {
			type = type || 'error';
			if (callback) {
				detail = "<a>" + detail + "</a>";
			}
			statusDiv.html('<div class="alert fade-in alert-' + type + '">' +
					'<button type="button" class="close" data-dismiss="alert">&#215;</button>' +
					'<strong>' + message + '</strong>' + detail + '</div>');
			if (callback) {
				statusDiv.find('a').click(callback);
			}
		},
		fileRetrieval = function (showPopup, repo, branch, path) {
			var	filesLoaded = function (result) {
					statusDiv.empty();
					var sorted = _.sortBy(result, function (item) {
						return item && item.type + ':' + item.name;
					});
					_.each(sorted, function (item) {
						var added;
						if (item) {
							if (item.type === 'repo') {
								added = template.filter('[data-mm-type=repo]').clone().appendTo(fileList);
								added.find('[data-mm-role=repo-link]').click(function () {
									fileRetrieval(false, item.name, item.defaultBranch, '');
								});
								added.find('[data-mm-role=repo-name]').text(item.name);
								added.find('[data-mm-role=repo-branch]').text(item.defaultBranch);
							} else if (item.type === 'dir') {
								added = template.filter('[data-mm-type=dir]').clone().appendTo(fileList);
								added.find('[data-mm-role=dir-link]').click(function () {
									fileRetrieval(false, repo, item.defaultBranch, item.path);
								});
								added.find('[data-mm-role=dir-name]').text(item.name);
							} else if (item.type === 'file') {
								added = template.filter('[data-mm-type=file]').clone().appendTo(fileList);
								added.find('[data-mm-role=file-link]').click(function () {
									modal.modal('hide');
									mapController.loadMap('h1' + item.path);
								});
								added.find('[data-mm-role=file-name]').text(item.name);
							}

						}
					});
				},
				showError = function (reason) {
					if (reason === 'failed-authentication') {
						showAlert('Authentication failed, we were not able to access your Github repositories');
					} else if (reason === 'not-authenticated') {
						showAlert(
							'<h4>Authorisation required<h4>',
							'block',
							'Click here to authorise with Github',
							function () {
								fileRetrieval(true, repo, branch, path);
							}
						);
					} else {
						showAlert('There was a network error, please try again later');
					}
				};
			fileList.empty();
			statusDiv.html('<i class="icon-spinner icon-spin"/> Retrieving files...');
			fileSystem.login(showPopup).then(function () {
				if (repo) {
					fileSystem.getFiles(repo, branch, path).then(filesLoaded, showError);
				} else {
					fileSystem.getRepositories().then(filesLoaded, showError);
				}
			}, showError);
		};
	modal.on('show', function () {
		fileRetrieval(false, '');
	});
};
MM.Extensions.GitHub = function () {
	'use strict';
	var fileSystem = new MM.GithubFileSystem(),
		mapController = MM.Extensions.components.mapController,
		modalOpen,
		loadUI = function (html) {
			var dom = $(html);
			modalOpen = dom.find('#modalGithubOpen').detach().appendTo('body').githubOpenWidget(fileSystem, mapController);
			$('[data-mm-role=save] ul').append(dom.find('[data-mm-role=save-link]'));
			$('[data-mm-role=open-sources]').prepend(dom.find('[data-mm-role=open-link]'));
		};
	mapController.addMapSource(new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(fileSystem)));
	mapController.validMapSourcePrefixesForSaving += fileSystem.prefix;
	$.get('/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/github.html', loadUI);
	$('<link rel="stylesheet" href="/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/github.css" />').appendTo($('body'));

};
MM.Extensions.GitHub();
