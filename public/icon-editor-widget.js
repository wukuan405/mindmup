/*global jQuery */
jQuery.fn.iconEditorWidget = function (mapModel) {
	'use strict';
	var self = this,
		confirmElement = self.find('[data-mm-role=confirm]'),
		sizeSelect = self.find('form select[name=size]'),
		customSizeBox = self.find('[data-mm-role=custom-size-enter]'),
		imgPreview = self.find('[data-mm-role=img-preview]'),
		clearButton = self.find('[data-mm-role=clear]'),
		positionSelect = self.find('select[name=position]'),
		widthBox = self.find('input[name=width]'),
		heightBox = self.find('input[name=height]'),
		ratioBox = self.find('input[name=keepratio]'),
		doConfirm = function () {
			mapModel.setIcon('icon-editor', imgPreview.attr('src'), Math.round(widthBox.val()), Math.round(heightBox.val()), positionSelect.val());
		},
		doClear = function () {
			mapModel.setIcon(false);
		},
		loadForm = function () {
			var icon = mapModel.getIcon();
			if (!icon) {
				imgPreview.hide();
				self.find('[data-mm-role=attribs]').hide();
			} else {
				imgPreview.show();
				imgPreview.attr('src', icon.url);
				self.find('[data-mm-role=attribs]').show();
				positionSelect.val(icon.position);
				widthBox.val(icon.width);
				heightBox.val(icon.height);
			}
		};
	self.find('[data-mm-role=drop-zone]').imageDropWidget(function (dataUrl, imgWidth, imgHeight, evt) {
		imgPreview.attr('src', dataUrl);
		widthBox.val(imgWidth);
		heightBox.val(imgHeight);
		self.find('[data-mm-role=attribs]').show();
		imgPreview.show();
	});
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
	this.on('show', function () {
		loadForm();
	});
	this.on('shown', function () {
		confirmElement.focus();
	});
	return this;
}
