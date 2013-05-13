/*jslint nomen: true*/
/*global _, jasmine, observable, beforeEach, describe, expect, it, jasmine, jQuery, spyOn, MAPJS, MM, localStorage*/
describe('Map Controller', function () {
	'use strict';
	var adapter1, adapter2, underTest, map;
	beforeEach(function () {
		MM.MapController.mapLocationChange = function () {};
		var adapterPrototype = observable({
				loadMap: function (mapId) {
					return jQuery.Deferred().resolve(map, mapId).promise();
				},
				saveMap: function (contentToSave, oldId) {
					return jQuery.Deferred().resolve(oldId).promise();
				},
				recognises: function () {
				}
			});
		map = MAPJS.content({ 'title': 'hello' });
		adapter1 = _.clone(adapterPrototype);
		adapter2 = _.clone(adapterPrototype);
		underTest = new MM.MapController([adapter1, adapter2], localStorage);
	});
	describe('isMapLoadingConfirmationRequired', function () {
		it('should be true if the loaded map has been changed', function () {
			underTest.setMap(map, 'foo');
			map.updateTitle(1, 'abc');
			expect(underTest.isMapLoadingConfirmationRequired()).toBeTruthy();
		});
		it('should be false if the loaded map has not been changed', function () {
			underTest.setMap(map, 'foo');
			expect(underTest.isMapLoadingConfirmationRequired()).toBeFalsy();
		});
		it('should be false if the loaded map has been saved', function () {
			underTest.setMap(map, 'foo');
			map.updateTitle(1, 'abc');
			underTest.publishMap();
			expect(underTest.isMapLoadingConfirmationRequired()).toBeFalsy();
		});
	});
	describe('loadMap', function () {
		it('should check each adapter to see if it recognises the mapId', function () {
			spyOn(adapter1, 'recognises');
			spyOn(adapter2, 'recognises');
			underTest.loadMap('foo');
			expect(adapter1.recognises).toHaveBeenCalledWith('foo');
			expect(adapter2.recognises).toHaveBeenCalledWith('foo');
		});
		it('should use the adapter which recognises the mapId', function () {
			spyOn(adapter2, 'recognises').andReturn(true);
			spyOn(adapter1, 'loadMap').andCallThrough();
			spyOn(adapter2, 'loadMap').andCallThrough();

			underTest.loadMap('foo');

			expect(adapter1.loadMap).not.toHaveBeenCalledWith('foo');
			expect(adapter2.loadMap).toHaveBeenCalledWith('foo');
		});
		it('should use first adapter to load as a fallback option', function () {
			spyOn(adapter1, 'loadMap').andCallThrough();

			underTest.loadMap('foo');

			expect(adapter1.loadMap).toHaveBeenCalledWith('foo');
		});
		it('should dispatch mapLoading Event beforeLoadingStarts', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapLoading', listener);

			underTest.loadMap('foo');

			expect(listener).toHaveBeenCalledWith('foo');
		});
		it('should dispatch mapLoadingFailed event if loadmap fails', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapLoadingFailed', listener);
			adapter1.loadMap = function () {
				var deferred = jQuery.Deferred();
				deferred.reject('errorMsg', 'error label');
				return deferred.promise();
			};

			underTest.loadMap('foo');

			expect(listener).toHaveBeenCalledWith('foo', 'errorMsg', 'error label');
		});
		it('should dispatch mapLoadingUnAuthorized event if loadmap fails with reason no-access-allowed', function () {
			var listener = jasmine.createSpy(),
				authListener = jasmine.createSpy();
			underTest.addEventListener('mapLoadingFailed', listener);
			underTest.addEventListener('mapLoadingUnAuthorized', authListener);
			adapter1.loadMap = function () {
				var deferred = jQuery.Deferred();
				deferred.reject('no-access-allowed');
				return deferred.promise();
			};

			underTest.loadMap('foo');

			expect(listener).not.toHaveBeenCalled();
			expect(authListener).toHaveBeenCalledWith('foo', 'no-access-allowed');
		});
		it('should dispatch mapLoaded event if loadMap succeeds', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapLoaded', listener);

			underTest.loadMap('foo');

			expect(JSON.stringify(listener.mostRecentCall.args[0])).toBe('{"title":"hello","formatVersion":2,"id":1}');
			expect(listener.mostRecentCall.args[1]).toBe('foo');
		});
		describe('mapLoadingConfirmationRequired event', function () {
			var listener;
			beforeEach(function () {
				listener = jasmine.createSpy('mapLoadingConfirmationRequired listener');
				underTest.addEventListener('mapLoadingConfirmationRequired', listener);
				underTest.setMap(map, 'foo');
			});
			it('should be dispatched when loading a map and the current map has unsaved changes', function () {
				map.updateTitle(1, 'abc');

				underTest.loadMap('xyz');

				expect(listener).toHaveBeenCalled();
				expect(listener.mostRecentCall.args[0]).toBe('xyz');
			});
			it('should not be dispatched when loading a map and the current map has unsaved changes if loading is forced', function () {
				map.updateTitle(1, 'abc');

				underTest.loadMap('xyz', true);
				expect(listener).not.toHaveBeenCalled();
			});
			it('should not be dispatched when loading a map and the current map has not been changed since loading', function () {
				underTest.loadMap('xyz');
				expect(listener).not.toHaveBeenCalled();
			});
			it('should not be dispatched when loading a map and the current map has not been changed since saving', function () {
				map.updateTitle(1, 'abc');
				underTest.publishMap();
				underTest.loadMap('xyz');

				expect(listener).not.toHaveBeenCalled();
			});
		});
	});
	describe('saveMap', function () {
		var map;
		beforeEach(function () {
			map = MAPJS.content({});
			underTest.setMap(map, 'loadedMapId');
		});
		it('should use first adapter to load as a fallback option', function () {
			spyOn(adapter1, 'saveMap').andCallThrough();

			underTest.publishMap();

			expect(adapter1.saveMap).toHaveBeenCalled();
		});
		it('should check each adapter to see if it recognises the mapId', function () {
			spyOn(adapter1, 'recognises');
			spyOn(adapter2, 'recognises');

			underTest.publishMap('foo');

			expect(adapter1.recognises).toHaveBeenCalledWith('foo');
			expect(adapter1.recognises).toHaveBeenCalledWith('loadedMapId');
			expect(adapter2.recognises).toHaveBeenCalledWith('foo');
			expect(adapter2.recognises).toHaveBeenCalledWith('loadedMapId');
		});
		it('should use the adapter which recognises the mapId', function () {
			adapter2.recognises = function (id) {return (id === 'loadedMapId'); };
			spyOn(adapter1, 'saveMap').andCallThrough();
			spyOn(adapter2, 'saveMap').andCallThrough();

			underTest.publishMap('foo');

			expect(adapter1.saveMap).not.toHaveBeenCalled();
			expect(adapter2.saveMap).toHaveBeenCalled();
		});
		it('should use the adapter which recognises the adapterType', function () {
			adapter2.recognises = function (id) {
				return id === 'foo';
			};
			spyOn(adapter1, 'saveMap').andCallThrough();
			spyOn(adapter2, 'saveMap').andCallThrough();

			underTest.publishMap('foo');

			expect(adapter1.saveMap).not.toHaveBeenCalled();
			expect(adapter2.saveMap).toHaveBeenCalled();
		});
		it('should dispatch mapSaving Event before Saving starts', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapSaving', listener);

			underTest.publishMap();

			expect(listener).toHaveBeenCalled();

		});
		it('should dispatch mapLoadingFailed event if saveMap fails', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapSavingFailed', listener);
			adapter1.saveMap = function () {
				return jQuery.Deferred().reject().promise();
			};

			underTest.publishMap();

			expect(listener).toHaveBeenCalled();
		});
		it('should dispatch mapSaved event if saveMap succeeds and mapId not changed', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapSaved', listener);

			underTest.publishMap();

			expect(listener).toHaveBeenCalledWith('loadedMapId', map, false);
		});
		it('should dispatch mapSaved and mapSavedAsNew event if saveMap succeeds and mapId has changed', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapSaved', listener);
			adapter1.saveMap = function () {
				return jQuery.Deferred().resolve('newMapId').promise();
			};

			underTest.publishMap();

			expect(listener).toHaveBeenCalledWith('newMapId', map, true);
		});
	});
});
