/*global $*/
$.fn.modalConfirmWidget = function () {
	'use strict';
	var self = this,
		titleElement = self.find('[data-mm-role=title]'),
		explanationElement = self.find('[data-mm-role=explanation]'),
		confirmElement = self.find('[data-mm-role=confirm]'),
		currentCallback = null;
	self.modal({keyboard: true, show: false});
	confirmElement.click(function () {
		if (currentCallback) {
			currentCallback();
		}
	});
	confirmElement.keydown('space', function () {
		if (currentCallback) {
			currentCallback();
		}
		self.hide();
	});
	this.showModalToConfirm = function (title, explanation, confirmButtonCaption, callback) {
		if (!callback) {
			throw 'cannot show confirm dialog without callback';
		}
		titleElement.text(title);
		explanationElement.html(explanation);
		confirmElement.text(confirmButtonCaption);
		currentCallback = callback;
		self.modal('show');
	};
	this.on('shown', function () {
		confirmElement.focus();
	});
	this.on('hidden', function () {
		currentCallback = undefined;
	});
	return this;
};

