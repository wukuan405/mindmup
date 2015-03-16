/* global jQuery */
jQuery.fn.iosModalExportWidget = function (exportRequestHandler) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this),
			parent = element.parent(),
			format = element.data('mm-format'),
			onExportRequest = function (exportFormat, widgetSetupFunction) {
				if (exportFormat !== format) {
					return;
				}

				var widget = element.clone();
				widget.appendTo(parent);
				widgetSetupFunction(widget);

				widget.on('hide', function () {
					widget.remove();
				});
				widget.trigger('show');
				widget.show();
			};

		exportRequestHandler.addEventListener('exportRequest', onExportRequest);
	});
};
