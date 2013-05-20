/*global $, MM, jQuery, JSON, _, gapi, MAPJS*/
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
							localSessionId,
							applyEvents = function (mindmupEvents, sessionId) {
								mindmupEvents.forEach(function (event) {
									//contentAggregate[event.cmd].apply(contentAggregate, event.args);
									contentAggregate.execCommand(event.cmd, event.args, sessionId);
								});
							},
							onEventAdded = function (event) {
								if (!event.isLocal) {
									applyEvents(event.values, "gd" + event.sessionId);
								}
							};
						if (!contentText) {
							deferred.reject("realtime-error", "Error loading " + mindMupId + " content");
							return;
						}
						localSessionId = 'gd' + _.find(doc.getCollaborators(), function (x) {return x.isMe; }).sessionId;
						contentAggregate = MAPJS.content(JSON.parse(contentText), localSessionId);
						console.log('local session', localSessionId);
						applyEvents(events.asArray(), localSessionId);
						contentAggregate.addEventListener('changed', function (command, params, session) {
							if (session === localSessionId) {
								events.push({cmd: command, args: params});
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
MM.Extensions.googleCollaboration = function () {
	'use strict';
	var googleDriveAdapter =  MM.Extensions.components.googleDriveAdapter,
		realtimeMapSource = new MM.RealtimeGoogleMapSource(googleDriveAdapter),
		mapController = MM.Extensions.components.mapController,
		alert =  MM.Extensions.components.alert,

		startSession = function (name) {
			realtimeMapSource.setNextSessionName(name);
			mapController.publishMap('cg').done(
				function loadMap(mapId) {
					mapController.loadMap(mapId);
				}
			);
		},

		load_ui = function (html) {
			var parsed = $(html),
				menu = parsed.find('[data-mm-role=top-menu]').clone().appendTo($('#mainMenu')),
				modal = parsed.find('[data-mm-role=modal-start]').clone().appendTo($('body')),
				sessionNameField = modal.find('input[name=session-name]'),
				setOnline = function (online) {
					var flag = online ? "online" : "offline",
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
			menu.find('[data-mm-role=start]').click(function () {
				sessionNameField.val('');
				sessionNameField.parent().removeClass('error');
				modal.modal('show');

			});
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
				googleDriveAdapter.showPicker('application/vnd.mindmup.collab', "Choose a realtime session").done(function (id) {
					mapController.loadMap("c" + id);
				});
			});
			menu.find('[data-mm-role=leave]').click(function () {
				mapController.loadMap('default');
			});
			modal.find('[data-mm-role=start-session]').click(initializeSessionFromUi);
			modal.find('form').submit(initializeSessionFromUi);

			mapController.addEventListener("mapLoaded", function (map, mapId) {
				setOnline(realtimeMapSource.recognises(mapId));
			});
			mapController.addEventListener("mapSaved", function (mapId) {
				setOnline(realtimeMapSource.recognises(mapId));
			});
		};
	mapController.addMapSource(realtimeMapSource);

	$.get('/e/google-collaboration.html?v=' + MM.Extensions.mmConfig.cachePreventionKey, function (data) {
		load_ui(data);
	});
	$('<link rel="stylesheet" href="/e/google-collaboration.css?v=' + MM.Extensions.mmConfig.cachePreventionKey + '" />').appendTo($('body'));
};
MM.Extensions.googleCollaboration();
