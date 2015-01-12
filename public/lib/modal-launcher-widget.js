/*global jQuery, document*/
jQuery.fn.modalLauncherWidget = function () {
	'use strict';
	return this.each(function () {
		var element = jQuery(this),
				keys = element.data('mm-launch-keys');
		if (keys) {
			jQuery(document).keydown(keys, function (event) {
				if (element.parent().length === 0) {
					return;
				}
				event.stopImmediatePropagation();
				event.preventDefault();
				if (jQuery('.modal:visible').length > 0) {
					return;
				}
				element.modal('show');
			});
		}
	});
};