/*global jQuery, Image, google, _, gapi, window, document*/
jQuery.fn.googleIntegratedIconEditorWidget = function (iconEditor, authenticator, config) {
	'use strict';
	var self = this,
		confirmElement = self.find('[data-mm-role~=confirm]'),
		sizeSelect = self.find('form select[name=size]'),
		customSizeBox = self.find('[data-mm-role=custom-size-enter]'),
		imgPreview = self.find('[data-mm-role=img-preview]'),
		clearButton = self.find('[data-mm-role~=clear]'),
		positionSelect = self.find('select[name=position]'),
		widthBox = self.find('input[name=width]'),
		heightBox = self.find('input[name=height]'),
		ratioBox = self.find('input[name=keepratio]'),
		fileUpload = self.find('input[name=selectfile]'),
		selectFile = self.find('[data-mm-role=select-file]'),
		downloadFile = self.find('[data-mm-role=download]'),
		doConfirm = function () {
			iconEditor.save({
				url: imgPreview.attr('src'),
				width: Math.round(widthBox.val()),
				height: Math.round(heightBox.val()),
				position: positionSelect.val()
			});
		},
		doClear = function () {
			iconEditor.save(false);
		},
		loadForm = function (icon) {
			if (!icon) {
				imgPreview.hide();
				self.find('[data-mm-role=attribs]').hide();
				clearButton.hide();
				confirmElement.hide();
				downloadFile.hide();
			} else {
				imgPreview.show();
				imgPreview.attr('src', icon.url);
				downloadFile.attr('href', icon.url).show();
				self.find('[data-mm-role=attribs]').show();
				positionSelect.val(icon.position);
				widthBox.val(icon.width);
				heightBox.val(icon.height);
				fileUpload.val('');
				clearButton.show();
				confirmElement.show();
			}
		},
		getDimensions = function (src) {
			var domImg = new Image(),
					deferred = jQuery.Deferred();
			domImg.onload = function () {
				deferred.resolve({width: domImg.width, height: domImg.height});
			};
			domImg.onerror = function () {
				deferred.reject();
			};
			domImg.src = src;
			return deferred.promise();
		},
		showPicker = function (config) {
			var deferred = jQuery.Deferred(),
				showPicker = function () {
					var picker;
					picker = new google.picker.PickerBuilder()
						.enableFeature(google.picker.Feature.SIMPLE_UPLOAD_ENABLED)
						.disableFeature(google.picker.Feature.MULTISELECT_ENABLED)
						.setAppId(config.appId)
						.addView(google.picker.ViewId.PHOTOS)
						.addView(google.picker.ViewId.PHOTO_UPLOAD)
						.setSelectableMimeTypes('application/vnd.google-apps.photo,image/png,image/jpg,image/gif,image/jpeg')
						.setOrigin(config.pickerOrigin || window.location.protocol + '//' + window.location.host)
						.setCallback(function (choice) {
							if (choice.action === 'picked') {
								var item = choice.docs[0],
										url = item.thumbnails && _.sortBy(item.thumbnails, 'height').pop().url;
								if (url) {
									deferred.resolve(url);
								} else {
									deferred.reject();
								}
								return;
							}
							if (choice.action === 'cancel') {
								deferred.reject();
							}
						})
						.setTitle('Choose an image')
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
		openPicker = function (fast) {
			self.modal('hide');
			showPicker(config).then(function (url) {
				getDimensions(url).then(function (dimensions) {
					if (fast) {
						iconEditor.save({
							url: url,
							width: dimensions.width,
							height: dimensions.height
						});
					} else {
						imgPreview.attr('src', url);
						downloadFile.attr('href', url).show();
						widthBox.val(dimensions.width);
						heightBox.val(dimensions.height);
						self.find('[data-mm-role=attribs]').show();
						imgPreview.show();
						confirmElement.show();
						confirmElement.focus();
						self.modal('show');
					}
				});
			});
		},
		isDownloadSupported = function () {
			var a = document.createElement('a');
			return typeof a.download != 'undefined';
		};
	selectFile.click(openPicker).keydown('space enter', openPicker);
	widthBox.on('change', function () {
		if (ratioBox[0].checked) {
			heightBox.val(Math.round(imgPreview.height() * parseInt(widthBox.val(), 10) / imgPreview.width()));
		}
	});
	heightBox.on('change', function () {
		if (ratioBox[0].checked) {
			widthBox.val(Math.round(imgPreview.width() * parseInt(heightBox.val(), 10) / imgPreview.height()));
		}
	});
	self.modal({keyboard: true, show: false});
	confirmElement.click(function () {
		doConfirm();
	}).keydown('space', function () {
		doConfirm();
		self.modal('hide');
	});
	clearButton.click(function () {
		doClear();
	}).keydown('space', function () {
		doClear();
		self.modal('hide');
	});
	sizeSelect.on('change', function () {
		if (sizeSelect.val() === 'custom') {
			customSizeBox.show();
		} else {
			customSizeBox.hide();
		}
	});
	fileUpload.remove();
	self.find('.modal-body .small').remove();
	iconEditor.addEventListener('iconEditRequested', function (icon, fast) {
		if (!fast && icon) {
			loadForm(icon);
			self.modal('show');
		}
		if (!icon) {
			openPicker(fast);
		}
	});
	if (isDownloadSupported()) {
		downloadFile.attr('download', 'image');
	} else {
		downloadFile.attr('target', '_blank');
	}
	return this;
};

