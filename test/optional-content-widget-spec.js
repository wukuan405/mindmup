/*global describe, beforeEach, afterEach, jasmine, jQuery, it, document, expect */
describe('optionalContentWidget', function () {
	'use strict';
	var underTest, mapModel, splittableController, template = '<div data-mm-activation-key="f" data-mm-activation-role="optionalContentWidget"><a data-mm-role="optionalContentWidget" >aloha</a></div>';
	beforeEach(function () {
		mapModel = jasmine.createSpyObj('mapModel', ['selectNode', 'setInputEnabled', 'getInputEnabled']);
		splittableController = jasmine.createSpyObj('splittableController', ['toggle']);
		underTest = jQuery(template).appendTo('body').optionalContentWidget(mapModel, splittableController);
		mapModel.getInputEnabled.and.returnValue(true);
	});
	afterEach(function () {
		underTest.remove();
	});
	it('toggles splittable controller on keystroke', function () {
		jQuery(document).trigger(jQuery.Event('keydown', {which: 70}));
		expect(splittableController.toggle).toHaveBeenCalled();
	});
	it('does not toggle on keystroke if input is disabled', function () {
		mapModel.getInputEnabled.and.returnValue(false);
		jQuery(document).trigger(jQuery.Event('keydown', {which: 70}));
		expect(splittableController.toggle).not.toHaveBeenCalled();
	});
	it('toggles splittable controller on click', function () {
		underTest.find('a').click();
		expect(splittableController.toggle).toHaveBeenCalled();
	});
	it('toggles splittable controller on click even if input is disabled', function () {
		mapModel.getInputEnabled.and.returnValue(false);
		underTest.find('a').click();
		expect(splittableController.toggle).toHaveBeenCalled();
	});
	it('fires show for any visible optional content on initial load', function () {
		underTest.remove();
		var listener = jasmine.createSpy('show');
		underTest = jQuery(template).appendTo('body').on('show', listener).optionalContentWidget(mapModel, splittableController);
		expect(listener).toHaveBeenCalled();
	});
	it('does not fire show for any non visible optional content on initial load', function () {
		underTest.remove();
		var listener = jasmine.createSpy('show');
		underTest = jQuery(template).appendTo('body').hide().on('show', listener).optionalContentWidget(mapModel, splittableController);
		expect(listener).not.toHaveBeenCalled();
	});
});
