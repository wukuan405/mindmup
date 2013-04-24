/*global jQuery*/
jQuery.fn.autoSaveWidget = function (autoSave, alertDispatcher) {
	'use strict';
	var self = this;
	autoSave.addEventListener('unsavedChangesAvailable', function () {
		self.modal('show');
	});
	self.find('[data-mm-role=apply]').click(function () {
		autoSave.applyUnsavedChanges();
		self.modal('hide');
	});
	self.find('[data-mm-role=discard]').click(function () {
		autoSave.discardUnsavedChanges();
		self.modal('hide');
	});
};
