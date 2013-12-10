/*global jQuery, MM*/
MM.LayoutExportController = function (mapModel, fileSystem, resultPoller, activityLog) {
	'use strict';
	var category = 'Map',
		eventType = 'PDF Export';
	this.startExport = function () {
		var deferred = jQuery.Deferred(),
			resolve = function () {
				activityLog.log(category, eventType + ' completed');
				deferred.resolve.apply(this, arguments);
			},
			reject = function (reason) {
				activityLog.log(category, eventType + ' failed', reason);
				deferred.reject.apply(this, arguments);
			};
		activityLog.log(category, eventType + ' started');
		fileSystem.saveMap(JSON.stringify(mapModel.getCurrentLayout())).then(function (fileId) {
			resultPoller.poll(fileId).then(resolve, reject);
		}, reject);
		return deferred.promise();
	};
};

jQuery.fn.layoutExportWidget = function (layoutExportController, modalConfirmation, alert) {
	'use strict';
	var alertId;
	this.click(function () {
		var exportComplete = function (url) {
				alert.hide(alertId);
				alertId = alert.show('PDF export complete: ', '<a target="_blank" href="' + url + '">Click here to open</a> (This link will remain available for 24 hours)');
			},
			exportFailed = function (reason) {
				var reasonMap = {
					'file-too-large': 'Your map is too large',
					'polling-timeout': 'The server is too busy. Please try again later, or if this error persists contact us at <a href="mailto:contact@mindmup.com?subject=MindMup%20PDF%20Export">contact@mindmup.com</a>'
				},
				reasonDescription = reasonMap[reason] || reason;
				alert.hide(alertId);

				alertId = alert.show('Unable to export PDF: ', reasonDescription, 'error');
			},
			doExport = function () {
				alert.hide(alertId);
				alertId = alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Please wait, exporting the map...');
				layoutExportController.startExport().then(exportComplete, exportFailed);
			};
		alert.hide(alertId);
		modalConfirmation.showModalToConfirm('Export to PDF (Beta)', 'Exporting maps to PDF is a work in progress at the moment. In this beta version we only support exporting maps up to 100k and the generated PDF will be saved in a <strong>publicly accessible location</strong>.', 'Proceed').then(doExport);
	});
	//
};
