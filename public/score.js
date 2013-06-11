/*global document, jQuery*/
jQuery.fn.scoreWidget = function (activityLog, alert, timeout, storage, storageKey, currentCohort) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this),
			send = function () {
				var val = element.find('button.active').val();
				if (val) {
					activityLog.log('Score', val, element.find('[name=why]').val());
					element.modal('hide');
				} else {
					element.find('button').effect('pulsate');
				}
				return false;
			},
		    dateToYMD = function (millis) {
				var date = new Date(millis),
					d = date.getDate(),
					m = date.getMonth() + 1,
					y = date.getFullYear();
				return String('') + y + (m <= 9 ? '0' + m : m) + (d <= 9 ? '0' + d : d);
			},
		    alertId,
			showIfNeeded = function () {
				var now = Date.now();
				/*jslint eqeq:true*/
				if (storage[storageKey] || currentCohort != dateToYMD(now)) {
					return;
				}
				alertId = alert.show('Please help us improve!', '<a data-toggle="modal" data-target="#modalScore">Click here to answer one very quick question</a>, we would appreciate that very much', 'warning');
				storage[storageKey] = now;
			};
		element.on('show', function () {
			if (alertId) {
				alert.hide(alertId);
			}
			element.find('button').removeClass('active');
			element.find('[name=why]').val('');
		});
		element.find('[data-mm-role=send]').click(send);
		element.find('form').submit(send);
		setTimeout(showIfNeeded, timeout * 1000);
	});
};
