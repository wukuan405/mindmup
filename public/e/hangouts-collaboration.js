/*global gapi, _, MAPJS, observable, jQuery, window, console, google, Image */
(function () {
	'use strict';
	var MM = (window.MM = (window.MM || {}));
	MM.Hangouts = {};
	MM.Hangouts.Collaboration = function () {
		var self = this,
				localSessionId = gapi.hangout.getLocalParticipantId(),
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
	MM.Hangouts.PresenceMediator = function (collaborationModel) {
		var localParticipant = gapi.hangout.getLocalParticipant(),
				colors = 'aqua,black,blue,fuchsia,gray,green,lime,maroon,navy,olive,orange,purple,red,silver,teal,white,yellow'.split(','),
				focusNodes = {},
				mmCollaborator = function (hangoutParticipant) {
					if (hangoutParticipant.person.id === localParticipant.person.id) {
						return false;
					}
					return {
						photoUrl: hangoutParticipant.person.image.url,
						focusNodeId: focusNodes[hangoutParticipant.id],
						sessionId: hangoutParticipant.person.id,
						name: hangoutParticipant.person.displayName,
						color: colors[hangoutParticipant.displayIndex % colors.length]
					};
				},
				onCollaboratorsJoined = function (participants) {
					_.each(participants, function (participant) {
						var collaborator = mmCollaborator(participant);
						if (collaborator) {
							collaborationModel.collaboratorPresenceChanged(collaborator, true);
						}
					});
				},
				onCollaboratorsLeft = function (participants) {
					_.each(participants, function (participant) {
						var collaborator = mmCollaborator(participant);
						if (collaborator) {
							collaborationModel.collaboratorPresenceChanged(collaborator, false);
						}
					});
				},
				onCollaboratorRequestedForContentSession = function (contentSessionId, callBack) {
					if (!callBack) {
						return;
					}
					var hangoutParticipant = contentSessionId && gapi.hangout.getParticipantById(contentSessionId),
						collaborator = hangoutParticipant && mmCollaborator(hangoutParticipant);
					if (collaborator && collaborator.sessionId) {
						callBack(collaborator);
					}
				},
				getHangoutParticipantByPersonId = function (personId) {
					return _.find(gapi.hangout.getParticipants(), function (p) {
						return p.person.id == personId;
					});
				},
				handleFocusRequest = function (userId, focusProcessor) {
					var participant = getHangoutParticipantByPersonId(userId),
						focusNode = participant && focusNodes[participant.id];
					if (focusProcessor && focusNode) {
						focusProcessor(focusNode);
					}
				},
				onMyFocusChanged = function (nodeId) {
					gapi.hangout.data.sendMessage(JSON.stringify({sessionId: localParticipant.id, nodeId: nodeId}));
				},
				onCollaboratorFocusMessageReceived = function (messageEvent) {
					var ob = JSON.parse(messageEvent.message);
					if (ob.sessionId && ob.sessionId !== localParticipant.id) {
						focusNodes[ob.sessionId] = ob.nodeId;
					}
					collaborationModel.collaboratorFocusChanged(mmCollaborator(gapi.hangout.getParticipantById(ob.sessionId)));
				},
				getCollaborators = function () {
					_.chain(gapi.hangout.getParticipants()).map(mmCollaborator).filter(_.identity).value();
				};
		gapi.hangout.onParticipantsRemoved.add(onCollaboratorsJoined);
		gapi.hangout.onParticipantsRemoved.add(onCollaboratorsLeft);
		gapi.hangout.data.onMessageReceived.add(onCollaboratorFocusMessageReceived);
		collaborationModel.addEventListener('myFocusChanged', onMyFocusChanged);
		collaborationModel.addEventListener('collaboratorRequestedForContentSession', onCollaboratorRequestedForContentSession);
		collaborationModel.addEventListener('sessionFocusRequested', handleFocusRequest);
		collaborationModel.start(getCollaborators());

		jQuery('#container').collaboratorPhotoWidget(collaborationModel, MM.deferredImageLoader, 'mm-collaborator');
		jQuery('#collaboratorSpeechBubble').collaboratorSpeechBubbleWidget(collaborationModel);

	};
	MM.Hangouts.showPicker = function (config) {
		var gapiScopes = 'https://www.googleapis.com/auth/photos https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/photos.upload',
			authenticator = new MM.GoogleAuthenticator(config.clientId, config.appId, gapiScopes),
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
				activityLog = console,
				collaborationModel = new MM.CollaborationModel(mapModel);
		jQuery('#container').domMapWidget(activityLog, mapModel, isTouch, imageInsertController, jQuery('#container'), hangoutsCollaboration.getResource);
		mapModel.setIdea(hangoutsCollaboration.getContentAggregate());

		MM.Hangouts.PresenceMediator(collaborationModel);

		jQuery('#uploadImg').click(function () {
			MM.Hangouts.showPicker(config).then(function (url) {
				MM.Hangouts.getDimensions(url).then(function (dimensions) {
					imageInsertController.dispatchEvent('imageInserted', url, dimensions.width, dimensions.height);
				});
			});
		});
	};
})();
