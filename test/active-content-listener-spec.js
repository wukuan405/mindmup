/*global MM, describe, beforeEach, observable, it, jasmine, expect, spyOn*/
describe('MM.activeContentListener', function () {
	'use strict';
	var underTest, mapController, onChangeFunction;
	beforeEach(function () {
		onChangeFunction = jasmine.createSpy();
		mapController = observable({});
		underTest = new MM.ActiveContentListener(mapController, onChangeFunction);
	});
	it('should return undefined as active content before a map is loaded', function () {
		expect(underTest.getActiveContent()).toBeUndefined();
	});
	describe('after first map is loaded', function () {
		var activeContent;
		beforeEach(function () {
			activeContent = observable({});
			spyOn(activeContent, 'addEventListener').and.callThrough();
			mapController.dispatchEvent('mapLoaded', 'loadedMapId', activeContent);
		});
		it('getActiveContent should return active content', function () {
			expect(underTest.getActiveContent()).toBe(activeContent);
		});
		it('should subscribe to loaded activeContent changed event', function () {
			expect(activeContent.addEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
		});
		it('should call onChangeFunction when map is loaded', function () {
			expect(onChangeFunction).toHaveBeenCalledWith(activeContent, true);
		});
		it('should call onChangeFunction when active content changed', function () {
			onChangeFunction.calls.reset();
			activeContent.dispatchEvent('changed');
			expect(onChangeFunction).toHaveBeenCalledWith(activeContent, false);
		});

		describe('when subsequent maps are loaded', function () {
			var newActiveContent;
			beforeEach(function () {
				newActiveContent = observable({});
				spyOn(newActiveContent, 'addEventListener').and.callThrough();
				spyOn(activeContent, 'removeEventListener').and.callThrough();
				onChangeFunction.calls.reset();
				mapController.dispatchEvent('mapLoaded', 'newMapId', newActiveContent);
			});
			it('getActiveContent should return latest active content', function () {
				expect(underTest.getActiveContent()).toBe(newActiveContent, true);
			});
			it('should unsubscribe from old activeContent changed event', function () {
				expect(activeContent.removeEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
			});
			it('should subscribe to new activeContent changed event', function () {
				expect(newActiveContent.addEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
			});
			it('should call onChangeFunction when active content changed', function () {
				onChangeFunction.calls.reset();
				newActiveContent.dispatchEvent('changed');
				expect(onChangeFunction.calls.count()).toBe(1);
				expect(onChangeFunction).toHaveBeenCalledWith(newActiveContent, false);
			});
		});
	});
});