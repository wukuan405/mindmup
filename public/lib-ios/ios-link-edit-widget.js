/*global jQuery */
jQuery.fn.iosLinkEditWidget = function (mapModel) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this);
		//this.updateLinkStyle = function (source, ideaIdFrom, ideaIdTo, prop, value) {
		mapModel.addEventListener('linkSelected', function (link, selectionPoint, linkStyle) {
			console.log('linkSelected', link, selectionPoint, linkStyle);
			element.find('[data-mm-role~="link-removal"]').data('mm-model-args', [link.ideaIdFrom, link.ideaIdTo]);
			element.find('[data-mm-role~="link-color"]').data('mm-model-args', [link.ideaIdFrom, link.ideaIdTo, 'color']);
			element.trigger(jQuery.Event('showPopover', selectionPoint));
		});
	});
};