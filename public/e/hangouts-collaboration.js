/*global gapi, _, MAPJS, observable, jQuery, window, console, google, Image */
(function () {
	'use strict';
	var MM = (window.MM = (window.MM || {}));
	MM.Hangouts = {};
	MM.Hangouts.HangoutGoogleAuthenticator = function (clientId) {
		var self = this,
			checkAuth = function (showDialog) {
				var deferred = jQuery.Deferred(),
						basicScopes = 'https://www.googleapis.com/auth/photos https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/photos.upload';
				deferred.notify('Authenticating with Google');
				gapi.auth.authorize(
					{
						'client_id': clientId,
						'scope': basicScopes,
						'immediate': !showDialog
					},
					function (authResult) {
						if (authResult && !authResult.error) {
							deferred.resolve(authResult.access_token);
						} else {
							deferred.reject('not-authenticated');
						}
					}
				);
				return deferred.promise();
			},
			loadApi = function (onComplete) {
				if (window.gapi && window.gapi.client && !_.isEmpty(gapi.client)) {
					onComplete();
				} else {
					window.googleClientLoaded = function () {
						onComplete();
					};
					jQuery('<script src="https://apis.google.com/js/client.js?onload=googleClientLoaded"></script>').appendTo('body');
				}
			};
		self.gapiAuthToken = function () {
			return window.gapi && gapi.auth && gapi.auth.getToken() && gapi.auth.getToken().access_token;
		};
		self.isAuthorised = function () {
			return !!(self.gapiAuthToken());
		};
		self.authenticate = function (showAuthenticationDialogs, requireEmail) {
			var deferred = jQuery.Deferred(),
				failureReason = showAuthenticationDialogs ? 'failed-authentication' : 'not-authenticated';
			loadApi(function () {
				checkAuth(showAuthenticationDialogs, requireEmail).then(deferred.resolve, function () {
					deferred.reject(failureReason);
				},
				deferred.notify);
			});
			return deferred.promise();
		};
	};


	MM.Hangouts.Collaboration = function () {
		var self = this,
				cleanSessionKey = function (string) {
					return string.replace(/[^A-Za-z0-9_-]/g, '_');
				},
				localSessionId = cleanSessionKey(gapi.hangout.getLocalParticipantId()),
				contentAggregate,
				keyIndex = 0,
				applyEvents = function (hangoutEvents, filterOutLocal) {
					_.chain(hangoutEvents).sortBy('timestamp').each(function (hangoutMetadata) {
						var event = JSON.parse(hangoutMetadata.value);
						if (!filterOutLocal || event.sessionId !== localSessionId) {
							contentAggregate.execCommand(event.cmd, event.args, event.sessionId);
						}
					});
				},
				nextKey = function () {
					keyIndex++;
					return localSessionId + '-' + keyIndex;
				},
				sendEvent = function (command, params) {
					gapi.hangout.data.setValue(nextKey(), JSON.stringify({cmd:command, args:params, sessionId: localSessionId}));
				},
				initialising = true,
				duringInitQueue = [],
				initContent = function () {
					contentAggregate = MAPJS.content(_.clone(MM.Maps.default), localSessionId);
					contentAggregate.addEventListener('changed', function (command, params, session) {
						if (session === localSessionId) {
							sendEvent(command, params);
						}
					});
					contentAggregate.addEventListener('resourceStored', function (resourceBody, resourceId, session) {
						if (session === localSessionId) {
							/* TODO: fix this to not use local resource memory */
							sendEvent({cmd: 'storeResource', args: [resourceBody, resourceId]});
						}
					});
					applyEvents(_.values(gapi.hangout.data.getStateMetadata()));
					initialising = false;
					applyEvents(duringInitQueue);
				},
				onStateChange = function (stateMutation) {
					if (!Array.isArray(stateMutation.addedKeys)) {
						return;
					}
					if (initialising) {
						duringInitQueue = duringInitQueue.concat(stateMutation.addedKeys);
					} else {
						applyEvents(stateMutation.addedKeys, true);
					}
				};
		self.getContentAggregate = function () {
			return contentAggregate;
		};
		self.storeResource = function (resourceUrl) {
			return resourceUrl;
		};
		self.getResource = function (internalUrl) {
			return internalUrl;
		};
		gapi.hangout.data.onStateChanged.add(onStateChange);
		initContent();
	};

	MM.Hangouts.showPicker = function (config) {
		var authenticator = new MM.Hangouts.HangoutGoogleAuthenticator(config.clientId),
			deferred = jQuery.Deferred(),
			showPicker = function () {
				var picker;
				picker = new google.picker.PickerBuilder()
					.enableFeature(google.picker.Feature.SIMPLE_UPLOAD_ENABLED)
					.disableFeature(google.picker.Feature.MULTISELECT_ENABLED)
					.setAppId(config.appId)
					.addView(google.picker.ViewId.PHOTOS)
					.addView(google.picker.ViewId.PHOTO_UPLOAD)
					.setSelectableMimeTypes('application/vnd.google-apps.photo,image/png,image/jpg,image/gif,image/jpeg')
					.setOrigin(config.pickerOrigin || window.location.protocol + '//' + window.location.host)
					.setCallback(function (choice) {
						if (choice.action === 'picked') {
							var item = choice.docs[0],
									url = item.thumbnails && _.sortBy(item.thumbnails, 'height').pop().url;
							if (url) {
								deferred.resolve(url);
							} else {
								deferred.reject();
							}
							return;
						}
						if (choice.action === 'cancel') {
							deferred.reject();
						}
					})
					.setTitle('Choose an image')
					.setOAuthToken(authenticator.gapiAuthToken())
					.build();
				picker.setVisible(true);
			};
		if (window.google && window.google.picker) {
			showPicker();
		} else {
			authenticator.authenticate(false).then(
				function () {
					gapi.load('picker', showPicker);
				},
				deferred.reject,
				deferred.notify
			);
		}
		return deferred.promise();
	};
	MM.Hangouts.getDimensions = function (src) {
		var domImg = new Image(),
				deferred = jQuery.Deferred();
		domImg.onload = function () {
			deferred.resolve({width: domImg.width, height: domImg.height});
		};
		domImg.onerror = function () {
			deferred.reject();
		};
		domImg.src = src;
		return deferred.promise();
	};
	MM.Hangouts.initMindMup = function (config) {
		jQuery('#container').empty();
		var isTouch = false,
				getStorage = function () {
					try {
						window.localStorage.setItem('testkey', 'testval');
						if (window.localStorage.getItem('testkey') === 'testval') {
							return window.localStorage;
						}
					} catch (e) {
					}
					return {
						fake: true,
						getItem: function (key) {
							return this[key];
						},
						setItem: function (key, val) {
							this[key] = val;
						},
						removeItem: function (key) {
							delete this[key];
						}
					};
				},
				hangoutsCollaboration = new MM.Hangouts.Collaboration(),
				browserStorage = getStorage(),
				alert = new MM.Alert(),
				objectStorage = new MM.JsonStorage(browserStorage),
				objectClipboard = new MM.LocalStorageClipboard(objectStorage, 'clipboard', alert, hangoutsCollaboration),
				mapModel = new MAPJS.MapModel(MAPJS.DOMRender.layoutCalculator, ['Press Space or double-click to edit'], objectClipboard),
				imageInsertController = observable({}),
				activityLog = console;
		jQuery('#container').domMapWidget(activityLog, mapModel, isTouch, imageInsertController, jQuery('#container'), hangoutsCollaboration.getResource);
		mapModel.setIdea(hangoutsCollaboration.getContentAggregate());

		jQuery('#uploadImg').click(function () {
			MM.Hangouts.showPicker(config).then(function (url) {
				MM.Hangouts.getDimensions(url).then(function (dimensions) {
					imageInsertController.dispatchEvent('imageInserted', url, dimensions.width, dimensions.height);
				});
			});
		});
	};
})();
