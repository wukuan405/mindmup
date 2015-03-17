/*global jQuery, MM, _*/
jQuery.fn.sendToGoogleDriveWidget = function (googleDriveAdapter) {
	'use strict';
	return this.each(function () {
		var self = jQuery(this),
			lastSavedId = false,
			fileNameField = self.find('[data-mm-role~=send-to-drive-file-name]'),
			formControlGroup = fileNameField.parents('div.control-group'),
			urlField =  self.find('[data-mm-role~=send-to-drive-url]'),
			convertibleTypes = [
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			],
			fileName = function () {
				var result = fileNameField.val();
				if (result) {
					result = result.trim();
				}
				return result;
			},
			setState = function (state) {
				self.find('.visible').hide();
				self.find('.visible' + '.' + state).show().find('[data-mm-show-focus]').focus();
			},
			setStatusMessage = function (message, progress) {
				self.find('[data-mm-role~=send-to-drive-status]').text(message + ' ' + (progress || ''));
			},
			transferFile = function () {
				MM.ajaxBlobFetch(urlField.val()).then(
					function (blob) {
						googleDriveAdapter.binaryUpload(blob, fileName(), blob.type, _.contains(convertibleTypes, blob.type)).then(
							function (result) {
								self.find('[data-mm-role~=send-to-drive-result-link]').attr('href', result.link);
								lastSavedId = result.id;
								setState('send-to-drive-done');
							},
							function (errorCode) {
								if (errorCode === 'not-authenticated') {
									setState('send-to-drive-unauthorised');
								} else {
									setStatusMessage ('File upload failed', errorCode);
									setState('send-to-drive-error');
								}
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
			},
			start = function () {
				var buttonClicked = jQuery(this),
						shouldShowDialogs = buttonClicked.is('[data-mm-showdialogs]');
				lastSavedId = false;
				if (fileName()) {
					setState('send-to-drive-progress');
					setStatusMessage ('Authorising with Google Drive');
					googleDriveAdapter.ready(shouldShowDialogs).then(transferFile, function () {
						if (!shouldShowDialogs) {
							setState('send-to-drive-unauthorised');
						} else {
							setStatusMessage ('Authorisation with Google failed');
							setState('send-to-drive-error');
						}
					});
				} else {
					fileNameField.parents('div.control-group').addClass('error');
				}
			};
		fileNameField.on('input change', function () {
			if (fileName()) {
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
