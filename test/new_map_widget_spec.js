/*global jasmine, expect, describe, beforeEach, jQuery, afterEach, it*/
describe('new map widget', function () {
	'use strict';
	var mapController, underTest,
		template = '<a href="#">XXX</a>';
	beforeEach(function () {
		mapController = jasmine.createSpyObj('mapController', ['loadMap']);
		underTest = jQuery(template).appendTo('body').newMapWidget(mapController);
	});
	afterEach(function () {
		underTest.remove();
	});
	it('should just load a new map with a random timestamp each time clicked', function () {
		underTest.click();
		expect(mapController.loadMap).toHaveBeenCalled();
		expect(mapController.loadMap.calls.mostRecent().args[0]).toMatch(/^new--[0-9]*$/);
		expect(mapController.loadMap.calls.mostRecent().args[1]).toBeFalsy();
	});
	it('should use a map source key if given', function () {
		underTest.attr('data-mm-map-source', 'x');
		underTest.click();
		expect(mapController.loadMap).toHaveBeenCalled();
		expect(mapController.loadMap.calls.mostRecent().args[0]).toMatch(/^new-x-[0-9]*$/);
		expect(mapController.loadMap.calls.mostRecent().args[1]).toBeFalsy();
	});
});
