/*global MM, describe, beforeEach, observable, it, jasmine, expect, spyOn*/
describe('MM.activeContentListener', function () {
	'use strict';
	var underTest, mapController, onChangeFunction;
	beforeEach(function () {
		onChangeFunction = jasmine.createSpy();
		mapController = observable({});
		underTest = new MM.ActiveContentListener(mapController, onChangeFunction);
	});
	describe('when first map is loaded', function () {
		var activeContent;
		beforeEach(function () {
			activeContent = observable({});
			spyOn(activeContent, 'addEventListener').and.callThrough();
			mapController.dispatchEvent('mapLoaded', 'newMapId', activeContent);
		});
		it('should subscribe to loaded activeContent changed event', function () {
			expect(activeContent.addEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
		});
		it('should call onChangeFunction when map is loaded', function () {
			expect(onChangeFunction).toHaveBeenCalledWith('newMapId', activeContent);
		});
		it('should call onChangeFunction when active content changed', function () {
			onChangeFunction.calls.reset();
			activeContent.dispatchEvent('changed');
			expect(onChangeFunction).toHaveBeenCalledWith('newMapId', activeContent);
		});

		describe('when subsequent maps are loaded', function () {
			// var newActiveContent;
			beforeEach(function () {
				// newActiveContent = jasmine.createSpyObj('activeContent');
				// mapController.dispatchEvent('mapLoaded', 'newMapId', newActiveContent);
			});
			it('should unsubscribe from old activeContent changed event', function () {

			});
			it('should subscribe to new activeContent changed event', function () {

			});
		});
	});
});