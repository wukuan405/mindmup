/*global describe, beforeEach, afterEach, jQuery, it, expect, jasmine, _*/
describe('splitFlipWidget', function () {
	'use strict';
	var underTest,
		mapModel,
		splittableController,
		template =
		'<div id="splitFlipWidgetElement">' +
			'<button data-mm-role="flipper" id="flipper1"></button>' +
			'<button data-mm-role="flipper" id="flipper2"></button>' +
		'</div>';
	beforeEach(function () {
		splittableController = jasmine.createSpyObj('splittableController', ['flip']);
		underTest = jQuery(template).appendTo('body').splitFlipWidget(splittableController, '[data-mm-role=flipper]', mapModel, 'f');
	});
	afterEach(function () {
		underTest.remove();
	});
	it('should return the dom element', function () {
		expect(underTest.attr('id')).toEqual('splitFlipWidgetElement');
	});
	describe('when mapModel.isEditingEnabled is true', function () {
		beforeEach(function () {
			mapModel = {isEditingEnabled: jasmine.createSpy('isEditingEnabled').and.returnValue(true)};
		});
		it('should call splittableController.click when click event fires on button matching selector', function () {
			_.each(['#flipper1', '#flipper2'], function (flipper) {
				splittableController.flip.calls.reset();
				jQuery(flipper).click();
				expect(splittableController.flip).toHaveBeenCalled();
			});
		});
		it('should call splittableController.click when key is pressed', function () {
			var e = jQuery.Event('keydown');
			e.which = 70; // Character 'f'
			underTest.trigger(e);
			expect(splittableController.flip).toHaveBeenCalled();
		});
	});
	describe('when mapModel.iisEditingEnabled is false', function () {
		beforeEach(function () {
			mapModel = {isEditingEnabled: jasmine.createSpy('isEditingEnabled').and.returnValue(false)};
		});
		it('should call splittableController.click when click event fires on button matching selector', function () {
			_.each(['#flipper1', '#flipper2'], function (flipper) {
				splittableController.flip.calls.reset();
				jQuery(flipper).click();
				expect(splittableController.flip).toHaveBeenCalled();
			});
		});
		it('should not call splittableController.click when key is pressed', function () {
			var e = jQuery.Event('keydown');
			e.which = 70; // Character 'f'
			underTest.trigger(e);
			expect(splittableController.flip).not.toHaveBeenCalled();
		});

	});
});
