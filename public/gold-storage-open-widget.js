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
		restoreMap = function (mapId, map) {
			goldMapStorageAdapter.saveMap(map, mapId, mapId, false).then(fileRetrieval);
		},
		deleteMap = function (mapId, title) {
			goldMapStorageAdapter.loadMap(mapId).then(
				function (map) {
					goldMapStorageAdapter.remove(mapId).then(
						function () {
							fileRetrieval();
							showAlert('Map "' + title + '" removed.', 'info', 'Undo', restoreMap.bind(undefined, mapId, map));
						});
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
						added.find('[data-mm-role=map-delete]').click(deleteMap.bind(undefined, file.id, file.title));
					}
				});
			} else {
				$('<tr><td colspan="3">No maps found</td></tr>').appendTo(parent);
			}
		},
		fileRetrieval = function () {
			parent.empty();
			statusDiv.html('<i class="icon-spinner icon-spin"/> Retrieving files...');
			goldMapStorageAdapter.list().then(loaded, function () { showAlert('Unable to retrieve files from Mindmup Gold', 'error'); });
		};
	template.detach();
	modal.on('show', function () {
		fileRetrieval();
	});
	return modal;
};
