/*global jQuery, MM, _ */
/**
 * Utility class that implements the workflow for requesting an export and polling for results.
 *
 * ## Export workflow
 *
 * MindMup.com supports several server processes that convert map (or layout) files into other formats (images, slides etc).
 * These server side resources require a valid Gold license for storage and billing, so the access is controlled
 * using the {{#crossLink "GoldApi"}}{{/crossLink}}. The general workflow to order an export is:
 *
 * 1. Ask the Gold API for an upload token for a particular upload format. Currently supported formats are:
 *    * pdf - the map file as a scalable vector PDF
 *    * png - the map as a bitmap image (PNG)
 *    * presentation.pdf - the slideshow as a scalable vector PDF
 *    * presentation.pptx - the slideshow as a PowerPoint file
 *    The Gold API will provide all information required to upload a
 *    file to Amazon S3, as well as signed URLs to check for the conversion result or error
 * 2. Upload the source content to Amazon S3. Note that some formats require a layout, some require an entire map.
 * 3. Poll the result and error URLs periodically. If the file appears on the result URL, download it and send to users. If
 *    a file appears on the error URL or nothing appears until the polling timeout, fail and stop polling
 *
 * This class coordinates all the complexity of the workflow and conversions in a simple convenience method.
 * For an example of how to wire it up, see https://github.com/mindmup/mindmup/blob/master/public/main.js
 *
 * @class LayoutExportController
 * @constructor
 * @param {Object} exportFunctions a hash-map _format -> function_ that coverts the active map to the content actually uploaded to the server
 * @param {Object} configurationGenerator object implementing the following API (for example a {{#crossLink "GoldApi"}}{{/crossLink}} instance)
 * @param {function} configurationGenerator.generateExportConfiguration (String format)
 * @param {Object} storageApi object implementing the following API (for example a {{#crossLink "S3Api"}}{{/crossLink}} instance):
 * @param {function} storageApi.save (String content, Object configuration, Object properties)
 * @param {function} storageApi.poll (URL urlToPoll, Object options)
 * @param {ActivityLog} activityLog logging interface
 */
MM.LayoutExportController = function (exportFunctions, configurationGenerator, storageApi, activityLog) {
	'use strict';
	var self = this,
		category = 'Map',
		getEventType = function (format) {
			if (!format) {
				return 'Export';
			}
			return format.toUpperCase() + ' Export';
		};
    /**
     * @method startExport
     * @param {String} format one of the supported formats, provided in the constructor
     * @param [exportProperties] any additional properties that will be merged into the exported data
     * @return {jQuery.Deferred} a jQuery promise that will be resolved with the URL of the exported document if successful
     */
	self.startExport = function (format, exportProperties) {
		var deferred = jQuery.Deferred(),
			eventType = getEventType(format),
			isStopped = function () {
				return deferred.state() !== 'pending';
			},
			reject = function (reason, fileId) {
				activityLog.log(category, eventType + ' failed', reason);
				deferred.reject(reason, fileId);
			},
			exported = exportFunctions[format](),
			layout = _.extend({}, exported, exportProperties);
		if (_.isEmpty(exported)) {
			return deferred.reject('empty').promise();
		}
		activityLog.log(category, eventType + ' started');
		configurationGenerator.generateExportConfiguration(format).then(
			function (exportConfig) {
				var fileId = exportConfig.s3UploadIdentifier;
				storageApi.save(JSON.stringify(layout), exportConfig, {isPrivate: true}).then(
					function () {
						var pollTimer = activityLog.timer(category, eventType + ':polling-completed'),
							pollTimeoutTimer = activityLog.timer(category, eventType + ':polling-timeout'),
							pollErrorTimer = activityLog.timer(category, eventType + ':polling-error'),
							resolve = function () {
								pollTimer.end();
								activityLog.log(category, eventType + ' completed');
								deferred.resolve(exportConfig.signedOutputUrl);
							};
						storageApi.poll(exportConfig.signedErrorListUrl, {stoppedSemaphore: isStopped, sleepPeriod: 15000}).then(
							function () {
								pollErrorTimer.end();
								reject('generation-error', fileId);
							});
						storageApi.poll(exportConfig.signedOutputListUrl, {stoppedSemaphore: isStopped, sleepPeriod: 5000}).then(
							resolve,
							function (reason) {
								pollTimeoutTimer.end();
								reject(reason, fileId);
							});
					},
					reject
				);
			},
			reject
		);
		return deferred.promise();
	};
};

jQuery.fn.layoutExportWidget = function (layoutExportController) {
	'use strict';
	return this.each(function () {
		var self = jQuery(this),
			selectedFormat = function () {
				var selector = self.find('[data-mm-role=format-selector]');
				if (selector && selector.val()) {
					return selector.val();
				} else {
					return self.data('mm-format');
				}
			},
			confirmElement = self.find('[data-mm-role=export]'),
			setState = function (state) {
				self.find('.visible').hide();
				self.find('.visible' + '.' + state).show();
			},
			exportComplete = function (url) {
				self.find('[data-mm-role=output-url]').attr('href', url);
				setState('done');
			},
			getExportMetadata = function () {
				var form = self.find('form[data-mm-role=export-parameters]'),
					exportType = {};
				if (form) {
					form.find('button.active').add(form.find('select')).add(form.find('input[type=hidden]')).each(function () {
						exportType[jQuery(this).attr('name')] = jQuery(this).val();
					});
				}
				return exportType;
			},
			exportFailed = function (reason, fileId) {
				self.find('[data-mm-role=contact-email]').attr('href', function () { return 'mailto:' + jQuery(this).text() + '?subject=MindMup%20' + selectedFormat().toUpperCase() + '%20Export%20Error%20' + fileId; });
				self.find('[data-mm-role=file-id]').html(fileId);
				self.find('.error span').hide();
				setState('error');

				var predefinedMsg = self.find('[data-mm-role=' + reason + ']');
				if (predefinedMsg.length > 0) {
					predefinedMsg.show();
				} else {
					self.find('[data-mm-role=error-message]').html(reason).show();
				}
			},
			doExport = function () {
				setState('inprogress');
				layoutExportController.startExport(selectedFormat(), {'export': getExportMetadata()}).then(exportComplete, exportFailed);
			};
		self.find('form').submit(function () {return false; });
		confirmElement.click(doExport).keydown('space', doExport);
		self.modal({keyboard: true, show: false});
		self.on('show', function () {
			setState('initial');
		}).on('shown', function () {
			confirmElement.focus();
		});
	});
};
MM.buildMapLayoutExporter = function (mapModel, resourceTranslator) {
	'use strict';
	return function () {
		var layout = mapModel.getCurrentLayout();
		if (layout && layout.nodes) {
			_.each(layout.nodes, function (node) {
				if (node.attr && node.attr.icon && node.attr.icon.url) {
					node.attr.icon.url = resourceTranslator(node.attr.icon.url);
				}
			});
		}
		return layout;
	};
};
