/*global jQuery, google, gapi, _, window, URL, Blob*/
jQuery.fn.googleIntegratedAttachmentEditorWidget = function (mapModel, authenticator, config) {
	'use strict';
	var self = this,
		changeFile = self.find('[data-mm-role~=change]'),
		confirmElement = self.find('[data-mm-role~=confirm]'),
		clearButton = self.find('[data-mm-role~=clear]'),
		source = 'googleIntegratedAttachmentEditor',
		myContentType = 'application/vnd.google.drive',
		unsupported = self.find('[data-mm-role~=unsupported-format]'),
		attachmentMetaData,
		doConfirm = function () {
			mapModel.setAttachment(source, ideaId, {contentType: myContentType, content: attachmentMetaData });
			self.modal('hide');
		},
		doClear = function () {
			mapModel.setAttachment(source, ideaId, false);
			self.modal('hide');
		},
		loadInfo = function () {
			self.find('.details').show();

			self.find('[data-mm-attachment-info]').each(function () {
				var field = jQuery(this),
					val = attachmentMetaData[field.data('mm-attachment-info')] || '';
				if (!val) {
					field.hide();
				} else {
					field.show();
					if (field.is('img')) {
						field.attr('src', val);
					} else if (field.is('a')) {
						field.attr('href', val);
					} else if (field.is('iframe')) {
						field.attr('src', val);
					} else if (field.is('span')) {
						field.text(val);
					}
				}
			});
		},
		createAttachmentMetaData = function (item) {
			return _.extend(_.pick(item, 'name', 'mimeType', 'type', 'url', 'iconUrl', 'description', 'embedUrl'), {
				thumbnail: item.thumbnails && _.sortBy(item.thumbnails, 'height').pop().url
			});
		},
		showPicker = function () {
			var deferred = jQuery.Deferred(),
				showPicker = function () {
					var picker,
						uploadView = new google.picker.DocsUploadView(),
						listView =  new google.picker.DocsView(google.picker.ViewId.DOCS);
					listView.setMode(google.picker.DocsViewMode.GRID);
					uploadView.setIncludeFolders(true);
					picker = new google.picker.PickerBuilder()
						.disableFeature(google.picker.Feature.MULTISELECT_ENABLED)
						.setAppId(config.appId)
						.addView(listView)
						.addView(google.picker.ViewId.DOCS_IMAGES)
						.addView(google.picker.ViewId.PHOTOS)
						.addView(uploadView)
						.setOrigin(config.pickerOrigin || window.location.protocol + '//' + window.location.host)
						.setCallback(function (choice) {
							if (choice.action === 'picked') {
								var item = choice.docs[0];
								deferred.resolve(createAttachmentMetaData(item));
								return;
							}
							if (choice.action === 'cancel') {
								deferred.reject();
							}
						})
						.setTitle('Upload or choose a file')
						.setOAuthToken(authenticator.gapiAuthToken())
						.build();
					picker.setVisible(true);
				};
			if (window.google && window.google.picker) {
				showPicker();
			} else {
				authenticator.authenticate(false).then(
					function () {
						gapi.load('picker', showPicker);
					},
					deferred.reject,
					deferred.notify
				);
			}
			return deferred.promise();
		},
		openPicker = function () {
			self.modal('hide');
			showPicker().then(function (pickedItem) {
				var hadPrevious = attachmentMetaData;
				attachmentMetaData = pickedItem;
				if (hadPrevious) {
					loadInfo();
					self.modal('show');
					self.find('[data-mm-show-for=initial]').hide();
					self.find('[data-mm-show-for=changed]').show();
					unsupported.hide();
				} else {
					doConfirm();
				}
			});
		},
		ideaId,
		blobUrl,
		open = function (activeIdea, attachment) {
			var contentType = attachment && attachment.contentType;
			ideaId = activeIdea;
			attachmentMetaData = attachment && attachment.content;
			if (attachment) {
				if (contentType === myContentType) {
					loadInfo();
				} else {
					unsupported.show();
					blobUrl = URL.createObjectURL(new Blob([attachment.content], {type : attachment.contentType}));
					attachmentMetaData = {embedUrl: blobUrl, url: blobUrl, type: 'HTML Document' };
				}
				loadInfo();
				self.find('[data-mm-show-for=initial]').show();
				self.find('[data-mm-show-for=changed]').hide();
				self.modal('show');
			} else {
				openPicker();
			}
		};
	self.on('hidden', function () {
		if (blobUrl) {
			URL.revokeObjectURL(blobUrl);
		}
		self.find('iframe[mm-attachment-info]').attr('src', '');
		unsupported.hide();
	});
	changeFile.click(openPicker).keydown('space enter', openPicker);
	self.modal({keyboard: true, show: false});
	confirmElement.click(doConfirm).keydown('space', doConfirm);
	clearButton.click(doClear).keydown('space', doClear);
	mapModel.addEventListener('attachmentOpened', open);
	return this;
};

