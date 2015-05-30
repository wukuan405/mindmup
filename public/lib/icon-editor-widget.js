/*global jQuery, MAPJS, MM, observable, document */

MM.iconEditor = function (mapModel, resourceManager) {
	'use strict';
	observable(this);
	var currentDeferred,
		self = this;
	this.editIcon = function (icon, isFast) {
		if (icon) {
			icon.url = resourceManager.getResource(icon.url);
		}
		currentDeferred = jQuery.Deferred();
		this.dispatchEvent('iconEditRequested', icon, isFast);
		return currentDeferred.promise();
	};
	this.save = function (icon) {
		currentDeferred.resolve(icon);
	};
	this.cancel = function () {
		currentDeferred.reject();
	};

	mapModel.addEventListener('nodeIconEditRequested', function () {
		var icon = mapModel.getIcon();
		self.editIcon(icon).then(function (result) {
			if (result) {
				mapModel.setIcon('icon-editor', resourceManager.storeResource(result.url), result.width, result.height, result.position);
			} else {
				mapModel.setIcon(false);
			}
		});
	});
	this.addIconNode = function () {
		self.editIcon(false, true).then(function (result) {
			if (result) {
				mapModel.dropImage(resourceManager.storeResource(result.url), result.width, result.height);
			}
		});
	};
};
jQuery.fn.iconEditorWidget = function (iconEditor, corsProxyUrl) {
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
		dropZone = self.find('[data-mm-role=drop-zone]'),
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
		openFile = function () {
			fileUpload.click();
		},
		insertController = new MAPJS.ImageInsertController(corsProxyUrl),
		isDownloadSupported = function () {
			var a = document.createElement('a');
			return typeof a.download != 'undefined';
		};
	selectFile.click(openFile).keydown('space enter', openFile);
	insertController.addEventListener('imageInserted',
		function (dataUrl, imgWidth, imgHeight) {
			imgPreview.attr('src', dataUrl);
			downloadFile.attr('href', dataUrl).show();
			widthBox.val(imgWidth);
			heightBox.val(imgHeight);
			self.find('[data-mm-role=attribs]').show();
			imgPreview.show();
			confirmElement.show();
			confirmElement.focus();
		}
	);
	dropZone.imageDropWidget(insertController);
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
	fileUpload.on('change', function (e) {
		insertController.insertFiles(this.files, e);
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
	this.on('show', function () {
		fileUpload.css('opacity', 0).val('');
	});
	this.on('shown', function () {
		fileUpload.css('opacity', 0).css('position', 'absolute')
			.offset(dropZone.offset()).width(dropZone.outerWidth()).height(dropZone.outerHeight());
		selectFile.focus();
	});
	iconEditor.addEventListener('iconEditRequested', function (icon) {
		loadForm(icon);
		self.modal('show');
	});
	if (isDownloadSupported()) {
		downloadFile.attr('download', 'image');
	} else {
		downloadFile.attr('target', '_blank');
	}
	return this;
};
