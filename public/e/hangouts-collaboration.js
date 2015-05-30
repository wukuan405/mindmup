/*global gapi, _, MAPJS, observable, jQuery, window, Blob, console */
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
		self.generateContentBlob = function () {
			var result = jQuery.Deferred(),
				fileParts = [JSON.stringify(contentAggregate)]; /* todo: images -> data URI */
			result.resolve(new Blob(fileParts, {type : 'application/vnd.mindmup'}));
			return result.promise();
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
		gapi.hangout.onParticipantsAdded.add(onCollaboratorsJoined);
		gapi.hangout.onParticipantsRemoved.add(onCollaboratorsLeft);
		gapi.hangout.data.onMessageReceived.add(onCollaboratorFocusMessageReceived);
		collaborationModel.addEventListener('myFocusChanged', onMyFocusChanged);
		collaborationModel.addEventListener('collaboratorRequestedForContentSession', onCollaboratorRequestedForContentSession);
		collaborationModel.addEventListener('sessionFocusRequested', handleFocusRequest);
		collaborationModel.start(getCollaborators());
	};
	jQuery.fn.contextMenuLauncher = function (mapModel, stageContainer) {
		return jQuery.each(this, function () {
			var element = jQuery(this),
					currentContextMenu,
					hideMenu = function () {
						if (currentContextMenu)	{
							currentContextMenu.popover('destroy');
							currentContextMenu = undefined;
						}
					},
					placement = function () {
						if (currentContextMenu.offset().top > stageContainer.innerHeight() - 260) {
							return 'top';
						}
						return 'bottom';
					};
			mapModel.addEventListener('contextMenuRequested', function (nodeId) {
				if (!mapModel.getEditingEnabled || mapModel.getEditingEnabled()) {
					var nodeElement = stageContainer.nodeWithId(nodeId);
					if (nodeElement && nodeElement.length) {
						currentContextMenu = nodeElement;
						mapModel.dispatchEvent('nodeVisibilityRequested', nodeId);
						element.find('[data-mm-menu]').hide();
						currentContextMenu.popover({
							html: true,
							title: '',
							placement: placement(),
							trigger: 'manual',
							container: 'body',
							content: function () {
								return element;
							}
						});
						currentContextMenu.popover('show');
					}
				}
			});
			mapModel.addEventListener('nodeSelectionChanged', hideMenu);
			element.find('[data-mm-show-menu]').click(function () {
				var menu = jQuery(this).data('mm-show-menu');
				element.find('[data-mm-menu=' + menu + ']').fadeToggle();
			});
			element.find('[data-mm-map-model]').click(function () {
				var clickElement = jQuery(this);
				if (!clickElement.hasClass('disabled')) {
					hideMenu();
				}
			});
			stageContainer.on('scroll click blur', hideMenu);
		});
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
				collaborationModel = new MM.CollaborationModel(mapModel),
				iconEditor = new MM.iconEditor(mapModel, hangoutsCollaboration),
				gapiScopes = 'https://www.googleapis.com/auth/photos https://www.googleapis.com/auth/drive.readonly  https://www.googleapis.com/auth/drive.file  https://www.googleapis.com/auth/photos.upload',
				googleAuthenticator = new MM.GoogleAuthenticator(config.clientId, config.appId, gapiScopes),
				googleDriveAdapter = new MM.GoogleDriveAdapter(googleAuthenticator, config.appId, config.networkTimeoutMillis, 'application/vnd.mindmup'),

				initWidgets = function () {
					jQuery('#container').domMapWidget(activityLog, mapModel, isTouch, imageInsertController, jQuery('#container'), hangoutsCollaboration.getResource);
					jQuery('body')
						.commandLineWidget('Shift+Space Ctrl+Space', mapModel)
						.searchWidget('Meta+F Ctrl+F', mapModel);
					jQuery('#uploadImg');
					jQuery('#modalIconEdit').googleIntegratedIconEditorWidget(iconEditor, googleAuthenticator, config);
					jQuery('.colorPicker-palette').addClass('topbar-color-picker');
					jQuery('.updateStyle[data-mm-align!=top]').colorPicker();
					jQuery('.colorPicker-picker').parent('a,button').click(function (e) {
						if (e.target === this) {
							jQuery(this).find('.colorPicker-picker').click();
						}
					});
					jQuery('#linkEditWidget').linkEditWidget(mapModel);
					jQuery('#container').collaboratorPhotoWidget(collaborationModel, MM.deferredImageLoader, 'mm-collaborator');
					jQuery('#collaboratorSpeechBubble').collaboratorSpeechBubbleWidget(collaborationModel);
					jQuery('#flexi-toolbar').rotatingToolbarWidget().nodeContextWidget(mapModel);
					jQuery('[data-title]').tooltip({container: 'body'});
					jQuery('[data-mm-role=add-photo-node]').click(iconEditor.addIconNode);
					jQuery('[data-mm-role=context-menu]').click(function () {
						mapModel.requestContextMenu();
						mapModel.editNode('flexi-toolbar', true);
					});
					jQuery('[data-mm-role=context-toolbar]').contextMenuLauncher(mapModel, jQuery('#container')).nodeContextWidget(mapModel);
					jQuery('#sendToDrive').sectionedModalWidget().sendToGoogleDriveWidget(googleDriveAdapter, hangoutsCollaboration.generateContentBlob);
					jQuery('#flexi-toolbar [data-mm-role=send-to-drive]').click(function () {
						jQuery('#sendToDrive').modal('show');
					});
				};

		MAPJS.DOMRender.stageVisibilityMargin = {top: 20, bottom: 20, left: 160, right: 160}; /* required for popover positioning */
		MAPJS.DOMRender.stageMargin = {top: 20, bottom: 20, left: 170, right: 170}; /* required for popover positioning */
		initWidgets();
		mapModel.setIdea(hangoutsCollaboration.getContentAggregate());

		MM.Hangouts.PresenceMediator(collaborationModel);
	};
})();
