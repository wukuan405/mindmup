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
	var alertId;
	this.click(function () {
		var exportComplete = function (url) {
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
		alert.hide(alertId);
		modalConfirmation.showModalToConfirm('Export to PDF (Beta)', 'Exporting maps to PDF is a work in progress at the moment. In this beta version, your map will be converted on our server and <strong>the generated PDF will be saved in a publicly accessible location</strong>. <br/><br/>Please cancel if you do not want the PDF of your map content to be publicly accessible.', 'Proceed').then(doExport);
	});
	//
};
