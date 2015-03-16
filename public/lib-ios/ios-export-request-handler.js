/*global MM, observable*/

MM.IOS.ExportRequestHandler = function (serverConnector, activityLog, activeContentListener) {
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
	self.handlesCommand = function (command) {
		return command && command.type && command.type == 'exportRequest';
	};
	self.handleCommand = function (command) {
		var format = command && command.args && command.args[0];
		if (format) {
			self.dispatchEvent('exportRequest', format, function (widgetElement) {
				widgetElement.layoutExportWidget(layoutExportController);
				widgetElement.atlasPrepopulationWidget(activeContentListener, 40, 150);
			});
		}
	};

	serverConnector.addEventListener('serverConnectorChanged', function () {
		layoutExportController = buildLayoutExportController();
	});

};
