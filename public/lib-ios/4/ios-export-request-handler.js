/*global MM, observable, jQuery*/

MM.IOS.ExportRequestHandler = function (serverConnector, activityLog, activeContentListener, mmProxy, resultContainerSelector) {
	'use strict';
	var self = observable(this),
		sharePostProcessing = MM.buildDecoratedResultProcessor(MM.ajaxResultProcessor, MM.layoutExportDecorators),
		exportHandlers = {
				'publish.json': { exporter: activeContentListener.getActiveContent, processor: sharePostProcessing}
		},
		buildLayoutExportController = function () {
			return new MM.LayoutExportController(exportHandlers, serverConnector.goldApi, serverConnector.s3Api, activityLog);
		},
		layoutExportController = buildLayoutExportController();
	resultContainerSelector = resultContainerSelector || 'ios-export-result';
	self.handlesCommand = function (command) {
		return command && command.type && command.type == 'exportRequest';
	};
	self.handleCommand = function (command) {
		var format = command && command.args && command.args[0];
		if (format) {
			self.dispatchEvent('exportRequest', format, function (widgetElement) {
				var resultContainer = widgetElement.find('[data-mm-role~="' + resultContainerSelector + '"]');
				widgetElement.iosModalWidget(mmProxy);
				widgetElement.layoutExportWidget(layoutExportController);
				widgetElement.atlasPrepopulationWidget(activeContentListener, 40, 150);
				widgetElement.find('[data-mm-role~="ios-send-export"]').iosExportResultSendWidget(mmProxy, resultContainer);
			});
		}
	};

	serverConnector.addEventListener('serverConnectorChanged', function () {
		layoutExportController = buildLayoutExportController();
	});

};

MM.layoutExportDecorators.iosResultDecorator = function (exportResult) {
	'use strict';
	var iosResult = {
		'thumb-png': exportResult['thumb-png'],
		'index-html': exportResult['index-html'],
		'archive-zip': exportResult['archive-zip'],
		'export': exportResult['export']
	};
	exportResult['ios-export-result'] = JSON.stringify(iosResult);
};

jQuery.fn.iosExportResultSendWidget = function (mmProxy, resultContainer) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this);
		element.click(function () {
			var result = resultContainer && resultContainer.size && resultContainer.size() > 0 && resultContainer.val(),
				sendMethod = element && result && result !== '' && element.data('mm-method'),
				resultObj = sendMethod && result && JSON.parse(result);
			if (resultObj) {
				resultObj.sendMethod = sendMethod;
				mmProxy.sendMessage({type: 'sendExportResult', args: resultObj});
			}
		});
	});
};
