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
			expect(activeContent.getResource.calls.mostRecent().args[0]).toMatch(/^[a-f0-9][a-f0-9-]*[a-f0-9]\/abc$/);
		});
	});
	describe('event processing', function () {
		var oldId;
		beforeEach(function () {
			activeContent.storeResource.and.returnValue('xxx');
			oldId = underTest.storeResource('abc');
			activeContent.getResource.and.returnValue('abc');
		});
		describe('when a map is changed', function () {
			beforeEach(function () {
				fakeMapController.dispatchEvent('mapLoaded', 'i2', activeContent);
			});
			it('storeResource returns a different URL for storeResource to avoid fake caching', function () {
				var result = underTest.storeResource('abc');
				expect(activeContent.storeResource).toHaveBeenCalledWith('abc');
				expect(result).not.toEqual(oldId);
			});
			it('will still retrieve the resource using the recorded URL from content', function () {
				var result = underTest.getResource(oldId);
				expect(result).toBe('abc');
				expect(activeContent.getResource.calls.mostRecent().args[0]).toMatch(/^[a-f0-9][a-f0-9-]*[a-f0-9]\/xxx$/);
			});
		});
		describe('when the content is changed', function () {
			beforeEach(function () {
				activeContent.dispatchEvent('changed', 'updateTitle', [1, 'x'], 'sessionKey');
			});
			it('storeResource does not change the URL scheme', function () {
				var result = underTest.storeResource('abc');
				expect(result).toEqual(oldId);
				expect(activeContent.storeResource).toHaveBeenCalledWith('abc');
			});
			it('will still retrieve the resource using the recorded URL from content', function () {
				var result = underTest.getResource(oldId);
				expect(result).toBe('abc');
				expect(activeContent.getResource.calls.mostRecent().args[0]).toMatch(/^[a-f0-9][a-f0-9-]*[a-f0-9]\/xxx$/);
			});
		});
	});
});
