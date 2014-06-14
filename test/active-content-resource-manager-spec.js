/*global MM, describe, beforeEach, it, jasmine, expect*/
describe('MM.ActiveContentResourceManager', function () {
	'use strict';
	var underTest, activeContentListener, activeContent;
	beforeEach(function () {
		activeContent = jasmine.createSpyObj('activeContent', ['storeResource', 'getResource']);
		activeContentListener = { getActiveContent: function () { return activeContent; }};
		underTest = new MM.ActiveContentResourceManager(activeContentListener, 'internal');
	});
	describe('storeResource', function () {
		it('delegates call to activeContent', function () {
			activeContent.storeResource.and.returnValue('xxx');
			var result = underTest.storeResource('abc');
			expect(result).toBe('internal:xxx');
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
			var result = underTest.getResource('internal:abc');
			expect(result).toBe('xxx');
			expect(activeContent.getResource).toHaveBeenCalledWith('abc');
		});
	});
});
