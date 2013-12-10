/*global jQuery, MM, _ */
MM.LayoutExportController = function (mapModel, fileSystem, resultPoller, activityLog) {
	'use strict';
	var category = 'Map',
		eventType = 'PDF Export';
	this.startExport = function (exportProperties) {
		var deferred = jQuery.Deferred(),
			resolve = function () {
				activityLog.log(category, eventType + ' completed');
				deferred.resolve.apply(this, arguments);
			},
			reject = function (reason) {
				activityLog.log(category, eventType + ' failed', reason);
				deferred.reject.apply(this, arguments);
			},
			layout = _.extend({}, mapModel.getCurrentLayout(), exportProperties);
		activityLog.log(category, eventType + ' started');
		fileSystem.saveMap(JSON.stringify(layout)).then(function (fileId) {
			resultPoller.poll(fileId).then(resolve, reject);
		}, reject);
		return deferred.promise();
	};
};

jQuery.fn.layoutExportWidget = function (layoutExportController, modalConfirmation, alert) {
	'use strict';
	var alertId,
		self = this,
		format = self.data('mm-format'),
		confirmElement = self.find('[data-mm-role=export]'),
		exportComplete = function (url) {
			alert.hide(alertId);
			alertId = alert.show(format + ' export complete: ', '<a target="_blank" href="' + url + '">Click here to open</a> (This link will remain available for 24 hours)');
		},
		exportFailed = function (reason) {
			var reasonMap = {
				'file-too-large': 'Your map is too large',
				'polling-timeout': 'The server is too busy. Please try again later, or if this error persists contact us at <a href="mailto:contact@mindmup.com?subject=MindMup%20PDF%20Export">contact@mindmup.com</a>'
			},
			reasonDescription = reasonMap[reason] || reason;
			alert.hide(alertId);

			alertId = alert.show('Unable to export ' + format + ': ', reasonDescription, 'error');
		},
		doExport = function () {
			alert.hide(alertId);
			alertId = alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Please wait, exporting the map...');
			layoutExportController.startExport({'export': {'page-size': 'A4', 'orientation': 'landscape'}}).then(exportComplete, exportFailed);
			self.modal('hide');
		};
	confirmElement.click(doExport).keydown('space', doExport);
	self.modal({keyboard: true, show: false});
	this.on('shown', function () {
		confirmElement.focus();
	});

};
