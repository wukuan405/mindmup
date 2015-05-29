/*global jQuery*/
jQuery.fn.sectionedModalWidget = function () {
	'use strict';
	return this.each(function () {
		var self = jQuery(this),
			setState = function (state) {
				self.find('.visible').hide();
				self.find('.visible' + '.' + state).show().find('[data-mm-show-focus]').focus();
				self.trigger(jQuery.Event('stateChanged', {'state': state}));
			};
		self.find('form').submit(function () {
			return false;
		});
		self.modal({keyboard: true, show: false, backdrop: 'static'});
		self.find('[data-mm-role=set-state]').click(function () {
			setState(jQuery(this).attr('data-mm-state'));
		});
		self.on('show', function (evt) {
			if (this === evt.target) {
				setState('initial');
			}
		});
	});
};

