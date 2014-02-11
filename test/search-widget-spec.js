/*global describe, beforeEach, afterEach, jQuery, jasmine, it, expect*/
describe('searchWidget', function () {
	'use strict';
	var underTest, mapModel;
	beforeEach(function () {
		mapModel = jasmine.createSpyObj('mapModel', ['search', 'getInputEnabled', 'setInputEnabled']);
		mapModel.getInputEnabled.and.returnValue(true);
		underTest = jQuery('<span><button data-mm-role="show-map-search"></button></span>');
		underTest.appendTo('body');
		underTest.searchWidget('f', mapModel);
	});
	afterEach(function () {
		underTest.detach();
	});
	it('should append an input when defined keys are sent', function () {
		var e = jQuery.Event('keydown');
		e.which = 70; // Character 'f'
		underTest.trigger(e);
		expect(underTest.find('input').length).toBe(1);
	});
	it('should bind to click of button and append input when button is clicked', function () {
		jQuery('[data-mm-role=show-map-search]').click();
		expect(underTest.find('input').length).toBe(1);
	});
});

