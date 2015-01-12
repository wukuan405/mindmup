/*global spyOn, jQuery, describe, beforeEach, it, expect, afterEach, document*/
describe('modalLauncherWidget', function () {
	'use strict';
	var underTest, otherModal, keyPressEvent;
	beforeEach(function () {
		keyPressEvent = jQuery.Event('keydown', {which: 80, metaKey: true, altKey: false});
		underTest = jQuery('<div class="modal hide fade"  data-mm-launch-keys="ctrl+p meta+p"/>').appendTo('body').modalLauncherWidget().hide();
		otherModal = jQuery('<div class="modal"/>').appendTo('body').hide();
		spyOn(jQuery.fn, 'modal');
		//expect(jQuery.fn.modal).toHaveBeenCalledOnJQueryObject(underTest);
	});
	afterEach(function () {
		underTest.remove();
		otherModal.remove();
	});
	it('should show the modal when the keys are sent to the document', function () {
		jQuery(document).trigger(keyPressEvent);
		expect(jQuery.fn.modal).toHaveBeenCalledOnJQueryObject(underTest);
		expect(jQuery.fn.modal).toHaveBeenCalledWith('show');
		expect(keyPressEvent.isDefaultPrevented()).toBeTruthy();
	});
	it('should no longer trigger the modal show once it has been removed', function () {
		underTest.detach();
		jQuery(document).trigger(keyPressEvent);
		expect(jQuery.fn.modal).not.toHaveBeenCalled();
	});
	it('should not show the modal if there are other modals visible', function () {
		otherModal.show();
		jQuery(document).trigger(keyPressEvent);
		expect(jQuery.fn.modal).not.toHaveBeenCalled();
	});
	it('should still prevent default when there are other modals visible', function () {
		otherModal.show();
		jQuery(document).trigger(keyPressEvent);
		expect(keyPressEvent.isDefaultPrevented()).toBeTruthy();
	});
});
