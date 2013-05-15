/*global $, MM*/
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
				};
			menu.find('[data-mm-role=start]').click(function () {
				sessionNameField.val();
				sessionNameField.parent().removeClass('error');
				modal.modal('show');
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
			modal.find('[data-mm-role=start-session]').click(function () {
				var sessionName = sessionNameField.val();
				if (!sessionName) {
					sessionNameField.parent().addClass('error');
					return false;
				}
				startSession(sessionName);
			});
			mapController.addEventListener("mapLoaded", function (map, mapId) {
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
