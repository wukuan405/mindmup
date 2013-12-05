/*global jQuery, MM*/
MM.LayoutExportController = function (mapModel, fileSystem, resultPoller) {
	'use strict';
	this.startExport = function () {
		var deferred = jQuery.Deferred();
		fileSystem.saveMap(JSON.stringify(mapModel.getCurrentLayout())).then(function (fileId) {
			resultPoller.poll(fileId).then(deferred.resolve, deferred.reject);
		}, deferred.reject);
		return deferred.promise();
	};
};

jQuery.fn.layoutExportWidget = function (layoutExportController, modalConfirmation, alert) {
	'use strict';
	this.click(function () {
		var alertId,
			exportComplete = function (url) {
				alert.hide(alertId);
				alertId = alert.show('PDF export complete', '<a target="_blank" href="' + url + '">Click here to open</a>');
			},
			exportFailed = function (reason) {
				alert.hide(alertId);
				alertId = alert.show('PDF export failed', reason, 'error');
			},
			doExport = function () {
				alert.hide(alertId);
				alertId = alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Please wait, exporting the map...');
				layoutExportController.startExport().then(exportComplete, exportFailed);
			};
		modalConfirmation.showModalToConfirm('Please confirm', 'Your data will be sent to our server to export the pdf', 'Proceed').then(doExport);
	});
	//
};
