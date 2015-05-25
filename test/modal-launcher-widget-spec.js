/*global jasmine, spyOn, jQuery, describe, beforeEach, it, expect, afterEach, document*/
describe('modalLauncherWidget', function () {
	'use strict';
	var underTest, otherModal, keyPressEvent, mapModel, focusElement, focusBeforeElement;
	beforeEach(function () {
		focusBeforeElement = jQuery('<input type="text"/>').appendTo('body');
		focusBeforeElement.focus();
		mapModel = jasmine.createSpyObj('mapModel', ['setInputEnabled']);
		keyPressEvent = jQuery.Event('keydown', {which: 80, metaKey: true, altKey: false});
		underTest = jQuery('<div class="modal hide fade"  data-mm-launch-key-code="80"></div>').appendTo('body').modalLauncherWidget(mapModel).hide();
		focusElement = jQuery('<a data-mm-modal-shown-focus="true"></a>').appendTo(underTest);
		otherModal = jQuery('<div class="modal"/>').appendTo('body').hide();
		spyOn(jQuery.fn, 'modal').and.callThrough();
		spyOn(jQuery.fn, 'focus').and.callThrough();
		spyOn(jQuery.fn, 'blur').and.callThrough();
	});
	afterEach(function () {
		focusBeforeElement.remove();
		focusElement.remove();
		underTest.remove();
		otherModal.remove();
	});
	it('should show the modal when the meta+keyCode are sent to the document', function () {
		jQuery(document).trigger(keyPressEvent);
		expect(jQuery.fn.modal).toHaveBeenCalledOnJQueryObject(underTest);
		expect(jQuery.fn.modal).toHaveBeenCalledWith('show');
		expect(keyPressEvent.isDefaultPrevented()).toBeTruthy();
	});
	it('should show the modal when the ctrl+keyCode are sent to the document', function () {
		keyPressEvent = jQuery.Event('keydown', {which: 80, ctrlKey: true, altKey: false});
		jQuery(document).trigger(keyPressEvent);
		expect(jQuery.fn.modal).toHaveBeenCalledOnJQueryObject(underTest);
		expect(jQuery.fn.modal).toHaveBeenCalledWith('show');
		expect(keyPressEvent.isDefaultPrevented()).toBeTruthy();
	});
	it('should not show the modal when the altKey is sent to the document', function () {
		keyPressEvent = jQuery.Event('keydown', {which: 80, ctrlKey: true, altKey: true});
		jQuery(document).trigger(keyPressEvent);
		expect(jQuery.fn.modal).not.toHaveBeenCalled();
		expect(keyPressEvent.isDefaultPrevented()).toBeFalsy();
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
	describe('handling modal showing and hiding', function () {
		it('should set mapModel input enabled to false and not hold focus when the modal is shown', function () {
			underTest.trigger('show');
			expect(mapModel.setInputEnabled).toHaveBeenCalledWith(false, false);
		});
		it('should blur the currently focussed element', function () {
			underTest.trigger('show');
			expect(jQuery.fn.blur).toHaveBeenCalledOnJQueryObject(focusBeforeElement);
		});
		it('should set mapModel input enabled to true and not hold focus when the modal is hidden', function () {
			underTest.trigger('hide');
			expect(mapModel.setInputEnabled).toHaveBeenCalledWith(true, false);
		});
		it('should focus on element marked as data-mm-modal-shown-focus when shown', function () {
			underTest.trigger('shown');
			expect(jQuery.fn.focus).toHaveBeenCalledOnJQueryObject(focusElement);
		});
		it('should refocus on the previously focussed element when modal is hidden', function () {
			underTest.trigger('show');
			underTest.trigger('hide');
			expect(jQuery.fn.focus).toHaveBeenCalledOnJQueryObject(focusBeforeElement);
		});
	});
});
