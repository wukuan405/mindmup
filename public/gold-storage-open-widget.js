/*global $, _ */

$.fn.goldStorageOpenWidget = function (goldMapStorageAdapter, mapController) {
	'use strict';
	var modal = this,
		template = this.find('[data-mm-role=template]'),
		parent = template.parent(),
		statusDiv = this.find('[data-mm-role=status]'),
		showAlert = function (message, type, prompt, callback) {
			type = type || 'block';
			var html = '<div class="alert fade-in alert-' + type + '">' +
					'<button type="button" class="close" data-dismiss="alert">&#215;</button>' +
					'<strong>' + message + '</strong>';
			if (callback && prompt) {
				html = html + '&nbsp;<a href="#" data-mm-role="auth">' + prompt + '</a>';
			}
			html = html + '</div>';
			statusDiv.html(html);
			$('[data-mm-role=auth]').click(function () {
				statusDiv.empty();
				callback();
			});
		},
		loaded = function (files) {
			statusDiv.empty();
			var sorted = [];
			sorted = _.sortBy(files, function (file) {
				return file && file.modifiedDate;
			}).reverse();
			if (sorted && sorted.length > 0) {
				_.each(sorted, function (file) {
					var added;
					if (file) {
						added = template.clone().appendTo(parent);
						added.find('a[data-mm-role=file-link]')
							.text(file.title)
							.click(function () {
								modal.modal('hide');
								mapController.loadMap(file.id);
							});
						added.find('[data-mm-role=modification-status]').text(new Date(file.modifiedDate).toLocaleString());
					}
				});
			} else {
				$('<tr><td colspan="3">No maps found</td></tr>').appendTo(parent);
			}
		},
		fileRetrieval = function () {
			var networkError = function () {
				showAlert('Unable to retrieve files from Mindmup Gold due to a network error. Please try again later. If the problem persists, please <a href="mailto:contact@mindmup.com">contact us</a>.', 'error');
			};
			parent.empty();
			statusDiv.html('<i class="icon-spinner icon-spin"/> Retrieving files...');
			goldMapStorageAdapter.list(false).then(loaded,
				function (reason) {
					if (reason === 'not-authorised') {
						goldMapStorageAdapter.list(true).then(loaded,
							function (reason) {
								if (reason === 'user-cancel') {
									modal.modal('hide');
								} else if (reason === 'not-authorised') {
									showAlert('The license key is invalid. To obtain or renew a MindMup Gold License, please send us an e-mail at <a href="mailto:contact@mindmup.com">contact@mindmup.com</a>', 'error');
								} else {
									networkError();

								}
							});
					} else {
						networkError();
					}
				});
		};
	template.detach();
	modal.on('show', function () {
		fileRetrieval();
	});
	return modal;
};
