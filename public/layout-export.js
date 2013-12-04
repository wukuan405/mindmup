/*global jQuery, MM, observable, */
MM.LayoutExportController = function (mapModel, fileSystem, resultPoller) {
	'use strict';
	var self = observable(this),
	layoutExported = function (url) {
		self.dispatchEvent('LayoutExportComplete', url);
	};
	this.startExport = function () {
		fileSystem.saveMap(JSON.stringify(mapModel.getCurrentLayout())).then(function (fileId) {
			console.log('fileId', fileId);
			resultPoller.poll(fileId).then(layoutExported);
		});
	};
};

jQuery.fn.layoutExportWidget = function (layoutExportController) {
	'use strict';
};
