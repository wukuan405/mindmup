/*global $, MM*/
console.log('google collaboration loaded');
MM.Extensions.googleCollaboration = function () {
	'use strict';

	var googleDriveAdapter =  MM.Extensions.components.googleDriveAdapter,
		alert =  MM.Extensions.components.alert,
		startSession = function (name) {
			googleDriveAdapter.createRealtimeMap(name).then(
				function (fileId) {
					alert.show('Yeehaa!' + fileId);
				},
				function () {
					alert.show('Problema!');
				}
			);
		},
		load_ui = function (html) {
			var parsed = $(html),
				menu = parsed.find('[data-mm-role=top-menu]').clone().appendTo($('#mainMenu')),
				modal = parsed.find('[data-mm-role=modal-start]').clone().appendTo($('body')),
				sessionNameField = modal.find('input[name=session-name]');
			menu.find('[data-mm-role=start]').click(function () {
				sessionNameField.val();
				sessionNameField.parent().removeClass('error');
				modal.modal('show');
			});
			modal.find('[data-mm-role=start-session]').click(function () {
				var sessionName = sessionNameField.val();
				if (!sessionName) {
					sessionNameField.parent().addClass('error');
					return false;
				} else {
					startSession(sessionName);
				}
			});
		};
	$.get('/e/google-collaboration.html', function (data) {
		load_ui(data);
	});
};
MM.Extensions.googleCollaboration();
