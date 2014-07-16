/*global jQuery*/
jQuery.fn.iosModalWidget = function () {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this);
		element.hide();
		element.find('[data-mm-role="modal-close"]').click(function () {
			element.hide();
		});
	});
};