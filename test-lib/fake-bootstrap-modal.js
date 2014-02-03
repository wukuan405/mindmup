/* global spyOn */
function fakeBootstrapModal(jQueryObject) {
	'use strict';
	spyOn(jQueryObject, 'modal').and.callFake(function (bootstrapOp) {
		if (bootstrapOp === 'show') {
			jQueryObject.show();
			jQueryObject.trigger('show');
			jQueryObject.trigger('shown');
		} else if (bootstrapOp === 'hide') {
			jQueryObject.hide();
			jQueryObject.trigger('hide');
			jQueryObject.trigger('hidden');
		}
	});
}
