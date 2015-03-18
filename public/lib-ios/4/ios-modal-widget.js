/*global jQuery*/
jQuery.fn.iosModalWidget = function (mmProxy) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this);
		element.hide();
		element.find('[data-mm-role~="dismiss-modal"]').click(function () {
			element.hideModal();
		});

		element.on('shown', function () {
			mmProxy.sendMessage({type: 'modal', args:['shown']});
		});
		element.on('hidden', function () {
			mmProxy.sendMessage({type: 'modal', args:['hidden']});
		});
	});

};

jQuery.fn.showModal = function () {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				wasHidden = !element.is(':visible');
		if (wasHidden) {
			element.trigger(jQuery.Event('show'));
		}
		element.show();
		if (wasHidden) {
			element.trigger(jQuery.Event('shown'));
		}
	});
};

jQuery.fn.hideModal = function () {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				wasVisible = element.is(':visible');
		if (wasVisible) {
			element.trigger(jQuery.Event('hide'));
		}
		element.hide();
		if (wasVisible) {
			element.trigger(jQuery.Event('hidden'));
		}
	});
};

