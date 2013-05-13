/*global beforeEach, afterEach, describe, expect, it, MM, $, spyOn, jasmine*/
describe('MM.navigation', function () {
	'use strict';
	var underTest;
	beforeEach(function () {
		localStorage.clear();
		underTest = new MM.navigation(localStorage);
		localStorage.setItem('mostRecentMapLoaded', 'most recent');
	});
	afterEach(function () {
		window.removeEventListener('mapIdChanged');
		window.location.hash = '';
	});
	describe('currentMapId', function () {
		it('should return mapId from window address hash', function () {
			window.location.hash = 'm:mapIdInHash';
			expect(underTest.currentMapId()).toBe('mapIdInHash');
		});
		it('should ignore window address hash and return most recent if it does not match format', function () {
			window.location.hash = 'mapIdInHash';
			expect(underTest.currentMapId()).toBe('most recent');
		});
		it('should return most recent mapid from storage if no map id in hash', function () {
			window.location.hash = '';
			expect(underTest.currentMapId()).toBe('most recent');
		});
		it('should return default as fallback', function () {
			window.location.hash = '';
			localStorage.clear();
			expect(underTest.currentMapId()).toBe('default');
		});

	});
	describe('changeMapId', function () {
		var listener;
		beforeEach(function () {
			window.location.hash = 'm:mapIdInHash';
			localStorage.clear();
			underTest = new MM.navigation(localStorage);
			listener = jasmine.createSpy();
			underTest.addEventListener('mapIdChanged', listener);
		});
		it('should return true when mapId is not the same', function () {
			expect(underTest.changeMapId('newMapId')).toBe(true);
		});
		it('should save the map id to storage', function () {
			underTest.changeMapId('newMapId');
			expect(localStorage.getItem('mostRecentMapLoaded')).toBe('newMapId');
		});
		it('should set window address hash to new mapId', function () {
			window.location.hash = '';
			underTest.changeMapId('default');
			expect(window.location.hash).toBe('#m:default');
		});
		it('should notify listeners of newMapId', function () {
			underTest.changeMapId('newMapId');
			expect(listener).toHaveBeenCalledWith('newMapId');
		});
		it('should return false when mapId is the same', function () {
			expect(underTest.changeMapId('mapIdInHash')).toBe(false);
			expect(window.location.hash).toBe('#m:mapIdInHash');
			expect(listener).not.toHaveBeenCalled();
		});
	});
});