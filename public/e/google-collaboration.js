/*global $, MM, jQuery, JSON, _, gapi, MAPJS, window, Image, Kinetic */
MM.RealtimeGoogleMapSource = function (googleDriveAdapter, mapModel, stage, alert) {
	'use strict';
	var nextSessionName,
		properties = {autoSave: true, sharable: true, editable: true},
		makeRealtimeReady = function (showAuth) {
			var deferred = jQuery.Deferred(),
				loadRealtimeApis = function () {
					if (gapi.drive && gapi.drive.realtime) {
						deferred.resolve();
					} else {
						gapi.load('auth:client,picker,drive-realtime,drive-share', deferred.resolve);
					}
				};
			googleDriveAdapter.ready(showAuth).then(loadRealtimeApis, deferred.reject, deferred.notify);
			return deferred.promise();
		},
		createRealtimeMap = function (name, initialContent, showAuth) {
			var deferred = jQuery.Deferred(),
				fileCreated = function (mindMupId) {
					gapi.drive.realtime.load(googleDriveAdapter.toGoogleFileId(mindMupId),
						function onFileLoaded() {
							deferred.resolve('c' + mindMupId, {autoSave: true, sharable: true, editable: true, reloadOnSave: true});
						},
						function initializeModel(model) {
							var list = model.createList();
							model.getRoot().set('events', list);
							model.getRoot().set('initialContent', JSON.stringify(initialContent));
						}
						);
				};
			makeRealtimeReady(showAuth).then(
				function () {
					googleDriveAdapter.saveFile('MindMup collaborative session ' + name, undefined, name, 'application/vnd.mindmup.collab').then(
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
	this.setNextSessionName = function (name) {
		nextSessionName = name;
	};
	this.loadMap = function loadMap(mindMupId, showAuth) {
		var deferred = jQuery.Deferred(),
			realtimeError = function () {
				deferred.reject('network-error');
				$(window).off('error', realtimeError);
			},
			initMap = function initMap() {
				try {
					$(window).on('error', realtimeError);
					gapi.drive.realtime.load(
						mindMupId.substr(3),
						function onFileLoaded(doc) {
							var modelRoot = doc.getModel().getRoot(),
								contentText = modelRoot.get('initialContent'),
								events = modelRoot.get('events'),
								getCollaboratorBySession = function (sessionKey) {
									return _.find(doc.getCollaborators(), function (x) { return String(x.sessionId) === String(sessionKey); }) || {};
								},
								contentAggregate,
								localSessionId,
								applyEvents = function (mindmupEvents, sessionId) {
									mindmupEvents.forEach(function (event) {
										contentAggregate.execCommand(event.cmd, event.args, sessionId);
									});
								},
								sessionImages = {},
								sessionFocus = {},
								followingSessionId,
								toggleFollow = function (sessionId) {
									if (sessionImages[followingSessionId]) {
										sessionImages[followingSessionId].attrs.opacity = 0.5;
									}
									if (followingSessionId !== sessionId) {
										followingSessionId = sessionId;
										sessionImages[followingSessionId].attrs.opacity = 1;
										alert.show("Following "  + getCollaboratorBySession(sessionId).displayName, "", "flash");
									} else {
										followingSessionId = undefined;
										alert.show("No longer following " + getCollaboratorBySession(sessionId).displayName, "", "flash");
									}
									sessionImages[sessionId].getLayer().draw();
								},
								makeImage = function (sessionKey) {
									var deferred = jQuery.Deferred(), domImg, kineticImg, collaborator;
									if (sessionImages[sessionKey]) {
										return deferred.resolve(sessionImages[sessionKey]).promise();
									}
									domImg = new Image();
									domImg.onload = function loadImage() {
										sessionImages[sessionKey] = new Kinetic.Image({
											x: 0,
											y: 0,
											image: domImg,
											width: 32,
											height: 32,
											opacity: 0.6
										});
										sessionImages[sessionKey].on("click tap", function () {
											toggleFollow(sessionKey);
										});
										deferred.resolve(sessionImages[sessionKey]);
									};
									collaborator = getCollaboratorBySession(sessionKey);
									if (collaborator.photoUrl) {
										domImg.src = collaborator.photoUrl;
									}
									return deferred.promise();
								},
								focusNodes = modelRoot.get('focusNodes'),
								showFocus = function (sessionId) {
									makeImage(sessionId).done(function (kineticImg) {
										var node = stage.get('#node_' + sessionFocus[sessionId]), xpos, ypos;
										if (!node || node.length === 0) {
											return;
										}
										xpos = node[0].getWidth() - kineticImg.getWidth() / 2;
										ypos = node[0].getHeight() - kineticImg.getHeight() / 2;
										if (kineticImg.getParent() === node[0] && xpos === kineticImg.attrs.x && ypos === kineticImg.attrs.y) {
											return;
										}
										kineticImg.remove();
										node[0].add(kineticImg);
										kineticImg.attrs.x = xpos;
										kineticImg.attrs.y = ypos;
										node[0].getLayer().draw();
										if (sessionId === followingSessionId) {
											mapModel.selectNode(sessionFocus[sessionId]);
										}
									});
								},
								onEventAdded = function (event) {
									if (!event.isLocal) {
										applyEvents(event.values, 'gd' + event.sessionId);
										showFocus(event.sessionId);
									}
								},
								onFocusChanged = function (event) {
									if (!event.isLocal) {
										sessionFocus[event.sessionId] = event.newValue;
										showFocus(event.sessionId);
									}
								},
								onCollaboratorLeft = function (event) {
									var profileImg = sessionImages[event.collaborator.sessionId],
										layer;
									alert.show("Collaborator left!", event.collaborator.displayName + " left this session", "flash");
									if (profileImg) {
										layer = profileImg.getLayer();
										profileImg.remove();
										layer.draw();
									}
								},
								onCollaboratorJoined = function (event) {
									alert.show("Collaborator joined!", event.collaborator.displayName + " joined this session", "flash");
								};
							if (!contentText) {
								$(window).off('error', realtimeError);
								deferred.reject('realtime-error', 'Error loading ' + mindMupId + ' content');
								return;
							}
							localSessionId = 'gd' + _.find(doc.getCollaborators(), function (x) {return x.isMe; }).sessionId;
							contentAggregate = MAPJS.content(JSON.parse(contentText), localSessionId);
							applyEvents(events.asArray(), localSessionId);
							contentAggregate.addEventListener('changed', function (command, params, session) {
								if (session === localSessionId) {
									events.push({cmd: command, args: params});
								}
							});
							events.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, onEventAdded);
							deferred.resolve(contentAggregate, mindMupId, properties);
							$(window).off('error', realtimeError);

							if (!focusNodes) {
								focusNodes = doc.getModel().createMap();
								modelRoot.set('focusNodes', focusNodes);
							}
							mapModel.addEventListener('nodeSelectionChanged', function (id, isSelected) {
								if (isSelected) {
									focusNodes.set(localSessionId, id);
								}
							});
							focusNodes.addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, onFocusChanged);
							doc.addEventListener(gapi.drive.realtime.EventType.COLLABORATOR_LEFT, onCollaboratorLeft);
							doc.addEventListener(gapi.drive.realtime.EventType.COLLABORATOR_JOINED, onCollaboratorJoined);
						},
						function initializeModel() {
							deferred.reject('realtime-error', 'Session ' + mindMupId + ' has not been initialised');
						},
						function errorHandler(error) {
							deferred.reject('realtime-error', error);
						}
					);
				} catch (e) {
					deferred.reject(e);
				}
			};
		makeRealtimeReady(showAuth).then(
			initMap,
			deferred.reject,
			deferred.notify
		);
		return deferred.promise();
	};
	this.saveMap = function (map, mapId, showAuth) {
		if (this.recognises(mapId) && mapId.length > 2) {
			return jQuery.Deferred().resolve(mapId, map, properties).promise(); /* no saving needed, realtime updates */
		}
		return createRealtimeMap(nextSessionName, map, showAuth);
	};
	this.description = 'Google Drive Realtime';
	this.recognises = function (mapId) {
		return (/^cg/).test(mapId);
	};
};
MM.Extensions.googleCollaboration = function () {
	'use strict';
	var googleDriveAdapter =  MM.Extensions.components.googleDriveAdapter,
		mapModel = MM.Extensions.components.mapModel,
		stage = MM.Extensions.components.container.data('mm-stage'),
		alert = MM.Extensions.components.alert,
		realtimeMapSource = new MM.RealtimeGoogleMapSource(googleDriveAdapter, mapModel, stage, alert),
		mapController = MM.Extensions.components.mapController,
		startSession = function (name) {
			realtimeMapSource.setNextSessionName(name);
			mapController.publishMap('cg');
		},
		loadUI = function (html) {
			var parsed = $(html),
				menu = parsed.find('[data-mm-role=top-menu]').clone().appendTo($('#mainMenu')),
				modal = parsed.find('[data-mm-role=modal-start]').clone().appendTo($('body')),
				sessionNameField = modal.find('input[name=session-name]'),
				setOnline = function (online) {
					var flag = online ? 'online' : 'offline',
						items = menu.find('[data-mm-collab-visible]');
					items.hide();
					items.filter('[data-mm-collab-visible=' + flag + ']').show();
				},
				initializeSessionFromUi = function () {
					var sessionName = sessionNameField.val();
					if (!sessionName) {
						sessionNameField.parent().addClass('error');
						return false;
					}
					modal.modal('hide');
					startSession(sessionName);
					return false;
				};
			$('#mainMenu').find('[data-mm-role=optional]').hide();
			menu.find('[data-mm-role=start]').click(function () {
				sessionNameField.val('');
				sessionNameField.parent().removeClass('error');
				modal.modal('show');
			});
			menu.find('[data-category]').trackingWidget(MM.Extensions.components.activityLog);
			modal.on('shown', function () {
				sessionNameField.focus();
			});
			menu.find('[data-mm-role=invite]').click(function () {
				var mapId = mapController.currentMapId();
				if (realtimeMapSource.recognises(mapId)) {
					googleDriveAdapter.showSharingSettings(mapId.substr(1));
				}
			});
			menu.find('[data-mm-role=join]').click(function () {
				googleDriveAdapter.showPicker('application/vnd.mindmup.collab', 'Choose a realtime session').done(function (id) {
					mapController.loadMap('c' + id);
				});
			});
			menu.find('[data-mm-role=leave]').click(function () {
				mapController.loadMap('default');
			});
			modal.find('[data-mm-role=start-session]').click(initializeSessionFromUi);
			modal.find('form').submit(initializeSessionFromUi);

			mapController.addEventListener('mapLoaded mapSaved', function (mapId) {
				setOnline(realtimeMapSource.recognises(mapId));
			});
		};
	mapController.addMapSource(new MM.RetriableMapSourceDecorator(realtimeMapSource));

	$.get('/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/google-collaboration.html', loadUI);
	$('<link rel="stylesheet" href="/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/google-collaboration.css" />').appendTo($('body'));
};
MM.Extensions.googleCollaboration();
