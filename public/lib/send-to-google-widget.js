/*global jQuery, MM*/
jQuery.fn.sendToGoogleDriveWidget = function (googleDriveAdapter) {
	'use strict';
	return this.each(function () {
		var self = jQuery(this),
			lastSavedId = false,
			fileNameField = self.find('[data-mm-role~=send-to-drive-file-name]'),
			formControlGroup = fileNameField.parents('div.control-group'),
			urlField =  self.find('[data-mm-role~=send-to-drive-url]'),
			setState = function (state) {
				self.find('.visible').hide();
				self.find('.visible' + '.' + state).show();
				self.find('.visible' + '.' + state).show().find('[data-mm-show-focus]').focus();
			},
			setStatusMessage = function (message, progress) {
				self.find('[data-mm-role~=send-to-drive-status]').text(message + ' ' + (progress || ''));
			},
			start = function () {
				lastSavedId = false;
				var fileName = fileNameField.val();
				if (fileName && fileName.trim()) {
					setState('send-to-drive-progress');
					MM.ajaxBlobFetch(urlField.val()).then(
						function (blob) {
							googleDriveAdapter.binaryUpload(blob, fileName, blob.type, true).then(
								function (result) {
									self.find('[data-mm-role~=send-to-drive-result-link]').attr('href', result.link);
									lastSavedId = result.id;
									setState('send-to-drive-done');
								},
								function (errorCode) {
									setStatusMessage ('File upload failed', errorCode);
									setState('send-to-drive-error');
								},
								function (percentComplete) {
									setStatusMessage ('Uploading content', percentComplete);
								});
						},
						function (xhr, statusText) {
							setStatusMessage ('File retrieval failed', statusText);
							setState('send-to-drive-error');
						},
						function (percentComplete) {
							setStatusMessage ('Retrieving file', percentComplete);
						});
				} else {
					fileNameField.parents('div.control-group').addClass('error');
				}
			};
		fileNameField.on('input change', function () {
			var fileName = fileNameField.val();
			if (fileName && fileName.trim()) {
				formControlGroup.removeClass('error');
			} else {
				formControlGroup.addClass('error');
			}
		});
		self.find('[data-mm-role=send-to-drive-kickoff]').click(start);
		self.find('[data-mm-role=send-to-drive-share]').click(function () {
			if (lastSavedId) {
				googleDriveAdapter.showSharingSettings(lastSavedId);
			}
		});
	});
};
