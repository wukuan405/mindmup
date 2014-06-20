/*global MM, describe, beforeEach, it, jasmine, expect, observable, MAPJS */
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
	describe('on new map load', function () {
		var withResources;
		beforeEach(function () {
			withResources = {
				title: 'test',
				attr: {icon: {url: 'internal:5/1/session1' }},
				ideas: {
					1: {
						attr: {icon: {url: 'internal:7/2/session1' }},
					},
					2: {
						attr: {icon: {url: 'internal:9/2/session2' }},
					},
					3: {
						attr: {icon: {url: 'internal:10' }},
					}
				},
				resources: {'5/1/session1': 'r1', '7/2/session1': 'r2', '9/2/session2': 'r3', '10': 'r4', '3/3/3': 'toBeRemoved'}
			};
			activeContent = MAPJS.content(withResources, 'session1');
			fakeMapController.dispatchEvent('mapLoaded', 'i2', activeContent);
		});
		it('does not clean up resources used with attr.icon.url in root', function () {
			expect(activeContent.resources['5/1/session1']).toBe('r1');
		});
		it('does not clean up resources used with attr.icon.url in children', function () {
			expect(activeContent.resources['7/2/session1']).toBe('r2');
		});
		it('cleans up resources not used in any nodes', function () {
			expect(activeContent.resources['3/3/3']).toBeFalsy();
		});
	});
});
