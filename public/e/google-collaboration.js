/*global $, MM, jQuery, JSON, _, gapi, MAPJS, window*/
MM.RealtimeGoogleMapSource = function (googleDriveAdapter) {
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
								contentAggregate,
								localSessionId,
								applyEvents = function (mindmupEvents, sessionId) {
									mindmupEvents.forEach(function (event) {
										//contentAggregate[event.cmd].apply(contentAggregate, event.args);
										contentAggregate.execCommand(event.cmd, event.args, sessionId);
									});
								},
								onEventAdded = function (event) {
									if (!event.isLocal) {
										applyEvents(event.values, 'gd' + event.sessionId);
									}
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
		realtimeMapSource = new MM.RealtimeGoogleMapSource(googleDriveAdapter),
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
