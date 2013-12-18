/*global jQuery, MM, _ */
MM.LayoutExportController = function (mapModel, fileSystem, poller, activityLog) {
	'use strict';
	var category = 'Map',
		eventType = 'PDF Export';
	this.startExport = function (exportProperties) {
		var deferred = jQuery.Deferred(),
			isStopped = function () {
				return deferred.state() !== 'pending';
			},
			reject = function (reason, fileId) {
				activityLog.log(category, eventType + ' failed', reason);
				deferred.reject(reason, fileId);
			},
			layout = _.extend({}, mapModel.getCurrentLayout(), exportProperties);
		activityLog.log(category, eventType + ' started');
		fileSystem.saveMap(JSON.stringify(layout)).then(function (fileId, config) {
			var resolve = function () {
				activityLog.log(category, eventType + ' completed');
				deferred.resolve(config.signedOutputUrl);
			};

			poller.poll(config.signedErrorListUrl, isStopped).then(function () { reject('generation-error', fileId); });
			poller.poll(config.signedOutputListUrl, isStopped).then(resolve, function (reason) { reject(reason, fileId); });
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
		getExportMetadata = function () {
			var form = self.find('form'),
				exportType = {};
			form.find('button.active').add(form.find('select')).each(function () {
				exportType[jQuery(this).attr('name')] = jQuery(this).val();
			});
			return exportType;
		},
		exportFailed = function (reason, fileId) {
			var reasonMap = {
				'generation-error': 'This map contains a feature not currently supported by ' + format + ' export. Please contact us at <a href="mailto:contact@mindmup.com?subject=MindMup%20PDF%20Export%20Error%20' + fileId + '">contact@mindmup.com</a> quoting the reference number: <input type="text" value="' + fileId + '" readonly />',
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
			layoutExportController.startExport({'export': getExportMetadata()}).then(exportComplete, exportFailed);
			self.modal('hide');
		};
	self.find('form').submit(function () {return false; });
	confirmElement.click(doExport).keydown('space', doExport);
	self.modal({keyboard: true, show: false});
	this.on('shown', function () {
		confirmElement.focus();
	});

};
