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
			expect(result).not.toBeUndefined();
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
			activeContent.storeResource.and.returnValue('abc');
			var id = underTest.storeResource('xxx'),
				result = underTest.getResource(id);
			expect(result).toBe('xxx');
			expect(activeContent.getResource).toHaveBeenCalledWith('abc');
		});
	});
});
