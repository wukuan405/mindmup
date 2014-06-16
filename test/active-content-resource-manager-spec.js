/*global MM, describe, beforeEach, it, jasmine, expect, observable*/
describe('MM.ActiveContentResourceManager', function () {
	'use strict';
	var underTest, activeContentListener, activeContent, fakeMapController;
	beforeEach(function () {
		activeContent = observable(jasmine.createSpyObj('activeContent', ['storeResource', 'getResource']));
		fakeMapController = observable({});
		activeContentListener = new MM.ActiveContentListener(fakeMapController);
		underTest = new MM.ActiveContentResourceManager(activeContentListener, 'internal');
		fakeMapController.dispatchEvent('mapLoaded', 'i1', activeContent);
	});
	describe('storeResource', function () {
		it('delegates call to activeContent', function () {
			activeContent.storeResource.and.returnValue('xxx');
			var result = underTest.storeResource('abc');
			expect(result).toBe('internal:1:xxx');
			expect(activeContent.storeResource).toHaveBeenCalledWith('abc');
		});
	});
	describe('getResource', function () {
		it('shortcuts the calls for non-recognised resources', function () {
			var url = 'http://abc',
				result = underTest.getResource(url);
			expect(result).toEqual(url);
			expect(activeContent.getResource).not.toHaveBeenCalled();
		});
		it('delegates recognised URLs to active content and returns result', function () {
			activeContent.getResource.and.returnValue('xxx');
			var result = underTest.getResource('internal:1:abc');
			expect(result).toBe('xxx');
			expect(activeContent.getResource).toHaveBeenCalledWith('abc');
		});
	});
	describe('event processing', function () {
		describe('increments internal prefix when a new map is loaded', function () {
			beforeEach(function () {
				fakeMapController.dispatchEvent('mapLoaded', 'i2', activeContent);
			});
			it('does not increment internal prefix for storeResource', function () {
				activeContent.storeResource.and.returnValue('xxx');
				var result = underTest.storeResource('abc');
				expect(result).toBe('internal:2:xxx');
				expect(activeContent.storeResource).toHaveBeenCalledWith('abc');
			});
			it('does not increment internal prefix for getResource', function () {
				activeContent.getResource.and.returnValue('xxx');
				var result = underTest.getResource('internal:2:abc');
				expect(result).toBe('xxx');
				expect(activeContent.getResource).toHaveBeenCalledWith('abc');
			});
		});
		describe('does not increment internal prefix on a internal map change', function () {
			beforeEach(function () {
				activeContent.dispatchEvent('changed', 'updateTitle', [1, 'x'], 'sessionKey');
			});
			it('does not increment internal prefix for storeResource', function () {
				activeContent.storeResource.and.returnValue('xxx');
				var result = underTest.storeResource('abc');
				expect(result).toBe('internal:1:xxx');
				expect(activeContent.storeResource).toHaveBeenCalledWith('abc');
			});
			it('does not increment internal prefix for getResource', function () {
				activeContent.getResource.and.returnValue('xxx');
				var result = underTest.getResource('internal:1:abc');
				expect(result).toBe('xxx');
				expect(activeContent.getResource).toHaveBeenCalledWith('abc');
			});
		});
	});
});
