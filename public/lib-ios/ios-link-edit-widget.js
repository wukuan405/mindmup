/*global jQuery */
jQuery.fn.iosLinkEditWidget = function (mapModel) {
	'use strict';
	return jQuery(this).each(function () {
		// var element = jQuery(this);
		mapModel.addEventListener('linkSelected', function (link, selectionPoint, linkStyle) {
			console.log('linkSelected', link, selectionPoint, linkStyle);
		});
	});
};