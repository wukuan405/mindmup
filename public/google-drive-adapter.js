/*global _, jQuery, MM, window, gapi, MAPJS */
MM.GoogleDriveAdapter = function (appId, clientId, apiKey, networkTimeoutMillis, defaultContentType) {
	'use strict';
	var self = this,
		driveLoaded,
		isAuthorised = function () {
			return !!(gapi && gapi.auth && gapi.auth.getToken() && gapi.auth.getToken().access_token);
		},
		recognises = function (mapId) {
			return mapId && mapId[0] === 'g';
		},
		googleMapId = function (mapId) {
			if (recognises(mapId)) {
				return mapId.substr(2);
			}
		},
		mindMupId = function (googleId) {
			return 'g1' + (googleId || '');
		},
		checkAuth = function (showDialog) {
			var deferred = jQuery.Deferred();
			deferred.notify('Authenticating with Google');
			gapi.auth.authorize(
				{
					'client_id': clientId,
					'scope': 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.install https://www.googleapis.com/auth/userinfo.profile',
					'immediate': !showDialog
				},
				function (authResult) {
					if (authResult) {
						deferred.resolve();
					} else {
						deferred.reject('not-authenticated');
					}
				}
			);
			return deferred.promise();
		},
		saveFile = function (contentToSave, mapId, fileName, paramContentType) {
			var	googleId =  googleMapId(mapId),
				deferred = jQuery.Deferred(),
				boundary = '-------314159265358979323846',
				delimiter = '\r\n--' + boundary + '\r\n',
				closeDelim = '\r\n--' + boundary + '--',
				contentType = paramContentType || defaultContentType,
				metadata = {
					'title': fileName,
					'mimeType': contentType
				},
				multipartRequestBody =
					delimiter +
					'Content-Type: application/json\r\n\r\n' +
					JSON.stringify(metadata) +
					delimiter +
					'Content-Type: ' + contentType + '\r\n' +
					'\r\n' +
					contentToSave +
					closeDelim,
				request = gapi.client.request({
					'path': '/upload/drive/v2/files' + (googleId ? '/' + googleId : ''),
					'method': (googleId ? 'PUT' : 'POST'),
					'params': {'uploadType': 'multipart', 'useContentAsIndexableText': (contentToSave.length < 131072)}, /* google refuses indexable text larger than 128k, see https://developers.google.com/drive/file */
					'headers': {
						'Content-Type': 'multipart/mixed; boundary=\'' + boundary + '\''
					},
					'body': multipartRequestBody
				});
			try {
				deferred.notify('sending to Google Drive');
				request.execute(function (resp) {
					var retriable  = [404, 500, 502, 503, 504, -1];
					if (resp.error) {
						if (resp.error.code === 403) {
							if (resp.error.reason && (resp.error.reason === 'rateLimitExceeded' || resp.error.reason === 'userRateLimitExceeded')) {
								deferred.reject('network-error');
							} else {
								deferred.reject('no-access-allowed');
							}
						} else if (resp.error.code === 401) {
							checkAuth(false).then(
								function () {
									saveFile(contentToSave, mapId, fileName).then(deferred.resolve, deferred.reject, deferred.notify);
								},
								deferred.reject,
								deferred.notify
							);
						} else if (_.contains(retriable, resp.error.code)) {
							deferred.reject('network-error');
						} else {
							deferred.reject(resp.error);
						}
					} else {
						deferred.resolve(mindMupId(resp.id));
					}
				});
			} catch (e) {
				deferred.reject('network-error', e.toString() + '\nstack: ' + e.stack + '\nauth: ' + JSON.stringify(gapi.auth.getToken()) + '\nnow: ' + Date.now());
			}
			return deferred.promise();
		},
		downloadFile = function (file) {
			var deferred = jQuery.Deferred();
			if (file.downloadUrl) {
				jQuery.ajax(
					file.downloadUrl,
					{
						progress: deferred.notify,
						headers: {'Authorization': 'Bearer ' + gapi.auth.getToken().access_token }
					}
				).then(
					deferred.resolve,
					deferred.reject.bind(deferred, 'network-error')
				);
			} else {
				deferred.reject('no-file-url');
			}
			return deferred.promise();
		},
		loadFile = function (fileId) {
			var deferred = jQuery.Deferred(),
				request = gapi.client.drive.files.get({
					'fileId': fileId
				});
			request.execute(function (resp) {
				var mimeType = resp.mimeType;
				if (resp.error) {
					if (resp.error.code === 403) {
						deferred.reject('network-error');
					} else if (resp.error.code === 404) {
						deferred.reject('no-access-allowed');
					} else {
						deferred.reject(resp.error);
					}
				} else {
					downloadFile(resp).then(
						function (content) {
							deferred.resolve(content, mimeType);
						},
						deferred.reject,
						deferred.notify
					);
				}
			});
			return deferred.promise();
		},
		authenticate = function (showAuthenticationDialogs) {
			var deferred = jQuery.Deferred(),
				failureReason = showAuthenticationDialogs ? 'failed-authentication' : 'not-authenticated';
			checkAuth(showAuthenticationDialogs).then(deferred.resolve, function () {
				deferred.reject(failureReason);
			}).progress(deferred.notify);
			return deferred.promise();
		},
		loadApi = function (onComplete) {
			if (window.gapi && window.gapi.client) {
				onComplete();
			} else {
				window.googleClientLoaded = onComplete;
				jQuery('<script src="https://apis.google.com/js/client.js?onload=googleClientLoaded"></script>').appendTo('body');
			}
		},
		makeReady = function (showAuthenticationDialogs) {
			var deferred = jQuery.Deferred();
			if (driveLoaded) {
				authenticate(showAuthenticationDialogs).then(deferred.resolve, deferred.reject, deferred.notify);
			} else {
				deferred.notify('Loading Google APIs');
				loadApi(function () {
					deferred.notify('Loading Google Drive APIs');
					gapi.client.setApiKey(apiKey);
					gapi.client.load('drive', 'v2', function () {
						driveLoaded = true;
						authenticate(showAuthenticationDialogs).then(deferred.resolve, deferred.reject, deferred.notify);
					});
				});
			}
			return deferred.promise();
		},
		makeRealtimeReady = function (showAuth) {
			var deferred = jQuery.Deferred(),
				loadRealtimeApis = function () {
					if (gapi.drive && gapi.drive.realtime) {
						deferred.resolve();
					} else {
						gapi.load("auth:client,drive-realtime,drive-share", deferred.resolve);
					}
				};
			self.ready(showAuth).then(loadRealtimeApis, deferred.reject, deferred.notify);
			return deferred.promise();
		};
	this.makeRealtimeReady = makeRealtimeReady;
	this.description = 'Google';

	this.ready = function (showAuthenticationDialogs) {
		var deferred = jQuery.Deferred();
		if (driveLoaded && isAuthorised()) {
			deferred.resolve();
		} else {
			makeReady(showAuthenticationDialogs).then(deferred.resolve, deferred.reject, deferred.notify);
		}
		return deferred.promise();
	};

	this.createRealtimeMap = function (name, initialContent, showAuth) {
		var deferred = jQuery.Deferred(),
			fileCreated = function (mindMupId) {
				gapi.drive.realtime.load(googleMapId(mindMupId),
					function onFileLoaded() {
						deferred.resolve("c" + mindMupId);
					},
					function initializeModel(model) {
						var list = model.createList(),
							initialMap = model.createString();
						model.getRoot().set("events", list);
						model.getRoot().set("initialContent", JSON.stringify(initialContent));
					}
					);
			};
		makeRealtimeReady(showAuth).then(
			function () {
				saveFile('MindMup collaborative session ' + name, undefined, name, 'application/vnd.mindmup.collab').then(
					fileCreated,
					deferred.reject,
					deferred.notify
				);
			},
			deferred.reject,
			deferred.notify
		);
		return deferred.promise();
	};
	this.recognises = recognises;

	this.retrieveAllFiles = function (searchCriteria) {
		var deferred = jQuery.Deferred(),
			retrievePageOfFiles = function (request, result) {
				request.execute(function (resp) {
					result = result.concat(resp.items);
					var nextPageToken = resp.nextPageToken;
					if (nextPageToken) {
						request = gapi.client.drive.files.list({
							'pageToken': nextPageToken,
							q: searchCriteria
						});
						retrievePageOfFiles(request, result);
					} else {
						deferred.resolve(result);
					}
				});
			};
		searchCriteria = searchCriteria || 'mimeType = \'' + defaultContentType + '\' and not trashed';
		retrievePageOfFiles(gapi.client.drive.files.list({ 'q': searchCriteria }), []);
		return deferred.promise();
	};

	this.loadMap = function (mapId, showAuthenticationDialogs) {
		var deferred = jQuery.Deferred(),
			googleId = googleMapId(mapId),
			readySucceeded = function () {
				loadFile(googleId).then(
					function (content, mimeType) {
						deferred.resolve(content, mapId, mimeType);
					},
					deferred.reject
				).progress(deferred.notify);
			};
		this.ready(showAuthenticationDialogs).then(readySucceeded, deferred.reject, deferred.notify);
		return deferred.promise();
	};

	this.saveMap = function (contentToSave, mapId, fileName, showAuthenticationDialogs) {
		var deferred = jQuery.Deferred();
		this.ready(showAuthenticationDialogs).then(
			function () {
				saveFile(contentToSave, mapId, fileName).then(deferred.resolve, deferred.reject, deferred.notify);
			},
			deferred.reject
		).progress(deferred.notify);
		return deferred.promise();
	};
	this.showSharingSettings = function (mindMupId) {
		var shareClient = new gapi.drive.share.ShareClient(appId);
		shareClient.setItemIds(googleMapId(mindMupId));
		shareClient.showSettingsDialog();
	};
};
MM.RealtimeGoogleMapSource = function (googleDriveAdapter) {
	'use strict';
	var nextSessionName;
	this.setNextSessionName = function (name) {
		nextSessionName = name;
	};
	this.loadMap = function loadMap(mindMupId, showAuth) {
		var deferred = jQuery.Deferred(),
			initMap = function initMap() {
				gapi.drive.realtime.load(
					mindMupId.substr(3),
					function onFileLoaded(doc) {
						var modelRoot = doc.getModel().getRoot(),
							contentText = modelRoot.get("initialContent"),
							events = modelRoot.get("events"),
							contentAggregate,
							currentRemoteEvent,
							localSessionId,
							applyEvents = function (mindmupEvents) {
								mindmupEvents.forEach(function (event) {
									currentRemoteEvent = event;
									try {
										contentAggregate[event.cmd].apply(contentAggregate, event.args);
									} catch (e) {
									}
									currentRemoteEvent = undefined;
								});
							},
							onEventAdded = function (event) {
								if (!event.isLocal) {
									applyEvents(event.values);
								}
							};
						if (!contentText) {
							deferred.reject("realtime-error", "Error loading " + mindMupId + " content");
							return;
						}
						localSessionId = _.find(doc.getCollaborators(), function (x) {return x.isMe; }).sessionId;
						contentAggregate = MAPJS.content(JSON.parse(contentText), localSessionId);
						console.log('local session', localSessionId);
						applyEvents(events.asArray());
						contentAggregate.addEventListener('changed', function (command, params) {
							var toPublish = {cmd: command, args: params};
							if (!_.isEqual(currentRemoteEvent, toPublish)) {
								events.push(toPublish);
							}
						});
						events.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, onEventAdded);
						deferred.resolve(contentAggregate, mindMupId);
					},
					function initializeModel(model) {
						deferred.reject("realtime-error", "Session " + mindMupId + " has not been initialised");
					}
				);
			};
		googleDriveAdapter.makeRealtimeReady(showAuth).then(
			initMap,
			deferred.reject,
			deferred.notify
		);
		return deferred.promise();
	};
	this.saveMap = function (map, mapId, showAuth) {
		if (this.recognises(mapId) && mapId.length > 2) {
			return jQuery.Deferred().resolve(mapId, map).promise(); /* no saving needed, realtime updates */
		}
		return googleDriveAdapter.createRealtimeMap(nextSessionName, map, showAuth);
	};
	this.description = 'Google Drive Realtime';
	this.recognises = function (mapId) {
		return (/^cg/).test(mapId);
	};
	this.autoSave = true;
};
