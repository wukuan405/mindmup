/*global beforeEach, afterEach, describe, expect, it, MM, spyOn, localStorage, observable, window*/
describe('MM.navigation', function () {
	'use strict';
	var underTest, mapController;
	beforeEach(function () {
		localStorage.clear();
		mapController = observable({
			isMapSharable: function () {},
			currentMapId: function () {},
			loadMap: function () {}
		});
		underTest = new MM.navigation(localStorage, mapController);

	});
	describe('loadInitial', function () {
		beforeEach(function () {
			spyOn(mapController, 'loadMap');
		});
		it('loads a map from hash URL if it is given', function () {
			window.location.hash = 'm:abc';
			underTest.loadInitial();
			expect(mapController.loadMap).toHaveBeenCalledWith('abc');
		});
		it('loads the most recently loaded map if hash is not given', function () {
			localStorage.setItem('mostRecentMapLoaded', 'most recent');
			underTest.loadInitial();
			expect(mapController.loadMap).toHaveBeenCalledWith('most recent');
		});
		it('loads the default map if no most recent', function () {
			underTest.loadInitial();
			expect(mapController.loadMap).toHaveBeenCalledWith('default');
		});
		it('loads default map if the hash format is invalid', function () {
			window.location.hash = 'abc';
			underTest.loadInitial();
			expect(mapController.loadMap).toHaveBeenCalledWith('default');
		});
		it('loads default map if the hash format is valid but special marker NIL is used as map ID', function () {
			window.location.hash = 'm:nil';
			underTest.loadInitial();
			expect(mapController.loadMap).toHaveBeenCalledWith('default');
		});
	});
	describe('mapController event listeners', function () {
		it('update window hash and local storage on map loaded', function () {
			window.location.hash = '';
			mapController.dispatchEvent('mapLoaded', 'newLoaded');
			expect(localStorage.getItem('mostRecentMapLoaded')).toBe('newLoaded');
			expect(window.location.hash).toBe('#m:newLoaded');
		});
		it('update window hash and local storage on map saveed', function () {
			window.location.hash = '';
			mapController.dispatchEvent('mapSaved', 'newSaved');
			expect(localStorage.getItem('mostRecentMapLoaded')).toBe('newSaved');
			expect(window.location.hash).toBe('#m:newSaved');
		});
		it('replaces map ID in a hash that contains map ID and some other stuff', function () {
			window.location.hash = 'prefix,m:xyz,def';
			mapController.dispatchEvent('mapLoaded', 'newLoaded');
			expect(localStorage.getItem('mostRecentMapLoaded')).toBe('newLoaded');
			expect(window.location.hash).toBe('#prefix,m:newLoaded,def');
		});
	});
	describe('hash change listener', function () {
		beforeEach(function () {
			spyOn(mapController, 'loadMap');
			spyOn(mapController, 'currentMapId').andReturn('abc');
		});
		it('adds map ID to hash after a comma if the hash was not a valid map ID', function () {
			window.location.hash = 'def';
			underTest.hashChange();
			expect(window.location.hash).toBe('#def,m:abc');
		});
		it('loads map from a hash that contains map ID and some other stuff', function () {
			window.location.hash = 'prefix,m:xyz,def';
			underTest.hashChange();
			expect(mapController.loadMap).toHaveBeenCalledWith('xyz');
			expect(window.location.hash).toBe('#prefix,m:xyz,def');
		});
		it('loads the map if the ID is valid', function () {
			window.location.hash = 'm:def';
			underTest.hashChange();
			expect(mapController.loadMap).toHaveBeenCalledWith('def');
			expect(window.location.hash).toBe('#m:def');
		});
		it('skips loading if ID was set to nil', function () {
			window.location.hash = 'm:nil';
			underTest.hashChange();
			expect(mapController.loadMap).not.toHaveBeenCalled();
			expect(window.location.hash).toBe('#m:nil');
		});
	});
	afterEach(function () {
		window.location.hash = '';
	});
});
