/*jslint nomen: true*/
/*global _, jasmine, observable, beforeEach, describe, expect, it, jasmine, jQuery, spyOn, MAPJS, MM, localStorage*/
describe('Map Controller', function () {
	'use strict';
	var adapter1, adapter2, underTest, map;
	beforeEach(function () {
		MM.MapController.mapLocationChange = function () {};
		var adapterPrototype = observable({
				loadMap: function (mapId) {
					return jQuery.Deferred().resolve(map, mapId, {editable: true}).promise();
				},
				saveMap: function (contentToSave, oldId) {
					return jQuery.Deferred().resolve(oldId, {editable: true}).promise();
				},
				recognises: function () {
					return true;
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
			spyOn(adapter2, 'recognises').and.returnValue(true);
			spyOn(adapter1, 'recognises').and.returnValue(false);
			spyOn(adapter1, 'loadMap').and.callThrough();
			spyOn(adapter2, 'loadMap').and.callThrough();

			underTest.loadMap('foo');

			expect(adapter1.loadMap).not.toHaveBeenCalledWith('foo');
			expect(adapter2.loadMap).toHaveBeenCalledWith('foo');
		});
		it('should not use an external adapter if loading the currently loaded map', function () {
			spyOn(adapter2, 'recognises').and.returnValue(true);
			spyOn(adapter2, 'loadMap').and.callThrough();

			underTest.loadMap('foo');

			adapter2.loadMap.calls.reset();
			underTest.loadMap('foo');

			expect(adapter2.loadMap).not.toHaveBeenCalled();
		});
		it('should dispatch mapIdNotRecognised event if no adapters recognise the mapId', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapIdNotRecognised', listener);
			spyOn(adapter1, 'recognises').and.returnValue(false);
			spyOn(adapter2, 'recognises').and.returnValue(false);

			underTest.loadMap('foo');

			expect(listener).toHaveBeenCalledWith('foo');
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
		it('should dispatch mapLoadingCancelled event if loadmap fails with reason user-cancel', function () {
			var listener = jasmine.createSpy(),
				cancelledListener = jasmine.createSpy();
			underTest.addEventListener('mapLoadingFailed', listener);
			underTest.addEventListener('mapLoadingCancelled', cancelledListener);
			adapter1.loadMap = function () {
				var deferred = jQuery.Deferred();
				deferred.reject('user-cancel');
				return deferred.promise();
			};

			underTest.loadMap('foo');

			expect(listener).not.toHaveBeenCalled();
			expect(cancelledListener).toHaveBeenCalled();
		});
		it('should dispatch mapLoaded event if loadMap succeeds', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapLoaded', listener);

			underTest.loadMap('foo');

			expect(JSON.stringify(listener.calls.mostRecent().args[1])).toBe('{"title":"hello","formatVersion":2,"id":1}');
			expect(listener.calls.mostRecent().args[0]).toBe('foo');
		});
		it('should not dispatch mapLoaded if the same map is loaded twice', function () {

			var listener = jasmine.createSpy();

			underTest.loadMap('foo');
			underTest.addEventListener('mapLoaded', listener);

			underTest.loadMap('foo');

			expect(listener).not.toHaveBeenCalled();
		});
		it('should dispatch mapLoadingCancelled event if the same map is loaded twice', function () {
			var listener = jasmine.createSpy();

			underTest.loadMap('foo');
			underTest.addEventListener('mapLoadingCancelled', listener);

			underTest.loadMap('foo');

			expect(listener).toHaveBeenCalledWith('foo');
		});
		it('should dispatch mapLoaded if the same map is loaded twice if forced', function () {

			var listener = jasmine.createSpy();

			underTest.loadMap('foo');
			underTest.addEventListener('mapLoaded', listener);

			underTest.loadMap('foo', true);

			expect(listener).toHaveBeenCalled();
		});
		it('should reload map with redirected id', function () {
			var listener = jasmine.createSpy();
			adapter1.recognises = function (mapId) {
				return mapId === 'foo';
			};
			spyOn(adapter1, 'loadMap').and.returnValue(jQuery.Deferred().reject('map-load-redirect', 'bar').promise());
			spyOn(adapter2, 'loadMap').and.callThrough();
			underTest.addEventListener('mapLoaded', listener);

			underTest.loadMap('foo', false);

			expect(adapter2.loadMap).toHaveBeenCalledWith('bar');
			expect(listener.calls.count()).toBe(1);
			expect(listener.calls.mostRecent().args[0]).toBe('bar');
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
				expect(listener.calls.mostRecent().args[0]).toBe('xyz');
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
	describe('publishMap', function () {
		var map;
		beforeEach(function () {
			map = MAPJS.content({});
			underTest.setMap(map, 'loadedMapId', {editable: true});
		});
		it('should use first adapter to load as a fallback option', function () {
			spyOn(adapter1, 'saveMap').and.callThrough();

			underTest.publishMap();

			expect(adapter1.saveMap).toHaveBeenCalled();
		});
		it('should check each adapter to see if it recognises the mapId', function () {
			spyOn(adapter1, 'recognises').and.returnValue(false);
			spyOn(adapter2, 'recognises').and.returnValue(true);

			underTest.publishMap('foo');

			expect(adapter1.recognises).toHaveBeenCalledWith('foo');
			expect(adapter2.recognises).toHaveBeenCalledWith('foo');
		});
		it('should use the adapter which recognises the mapId', function () {
			spyOn(adapter1, 'recognises').and.returnValue(false);
			adapter2.recognises = function (id) {
				return (id === 'loadedMapId');
			};
			spyOn(adapter1, 'saveMap').and.callThrough();
			spyOn(adapter2, 'saveMap').and.callThrough();

			underTest.publishMap();

			expect(adapter1.saveMap).not.toHaveBeenCalled();
			expect(adapter2.saveMap).toHaveBeenCalled();
		});
		it('should use the adapter which recognises the adapterType', function () {
			spyOn(adapter1, 'recognises').and.returnValue(false);
			adapter2.recognises = function (id) {
				return id === 'foo';
			};
			spyOn(adapter1, 'saveMap').and.callThrough();
			spyOn(adapter2, 'saveMap').and.callThrough();

			underTest.publishMap('foo');

			expect(adapter1.saveMap).not.toHaveBeenCalled();
			expect(adapter2.saveMap).toHaveBeenCalled();
		});
		it('should pass the map content and current map id to the adapter', function () {
			spyOn(adapter1, 'recognises').and.returnValue(true);
			spyOn(adapter1, 'saveMap').and.callThrough();
			underTest.publishMap('foo');
			expect(adapter1.saveMap).toHaveBeenCalledWith(map, 'loadedMapId');
		});
		it('should not pass the current map id if forced as new', function () {
			spyOn(adapter1, 'recognises').and.returnValue(true);
			spyOn(adapter1, 'saveMap').and.callThrough();
			underTest.publishMap('foo', true);
			expect(adapter1.saveMap).toHaveBeenCalledWith(map, '');
		});
		it('should dispatch mapSaving Event before Saving starts', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapSaving', listener);

			underTest.publishMap();

			expect(listener).toHaveBeenCalled();

		});
		it('should dispatch mapLoadingFailed event if saveMap fails', function () {
			var failed = jasmine.createSpy('failed'),
				cancelled = jasmine.createSpy('cancelled');
			underTest.addEventListener('mapSavingFailed', failed);
			underTest.addEventListener('mapSavingCancelled', cancelled);
			adapter1.saveMap = function () {
				return jQuery.Deferred().reject('user-cancel').promise();
			};
			underTest.publishMap();
			expect(cancelled).toHaveBeenCalled();
			expect(failed).not.toHaveBeenCalled();
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
		it('should dispatch mapSaved event if saveMap succeeds', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('mapSaved', listener);

			underTest.publishMap();

			expect(listener).toHaveBeenCalledWith('loadedMapId', map, {editable: true});
		});
		describe('reloadOnSave', function () {
			beforeEach(function () {
				adapter1.recognises = function (mapId) {
					return mapId === '1foo';
				};
				adapter2.recognises = function (mapId) {
					return mapId === '2foo';
				};
				spyOn(adapter1, 'saveMap').and.returnValue(jQuery.Deferred().resolve('1foo', {reloadOnSave: true}).promise());
				spyOn(adapter1, 'loadMap').and.returnValue(jQuery.Deferred().resolve(map, '1foo', {reloadOnSave: true, editable: true}).promise());
				spyOn(adapter2, 'saveMap').and.returnValue(jQuery.Deferred().resolve('2foo', {}).promise());
				spyOn(underTest, 'loadMap').and.callThrough();
			});
			it('should not reload the map if saved map properties do not specify reloadOnSave', function () {
				underTest.publishMap('2foo');
				expect(underTest.loadMap).not.toHaveBeenCalled();
			});
			it('should reload the map if saved map properties has reloadOnSave set to true', function () {
				underTest.publishMap('1foo');
				expect(underTest.loadMap).toHaveBeenCalledWith('1foo', true);
			});
			it('should reload the map if saving over a map that had reloadOnSave set to true', function () {
				underTest.publishMap('1foo');
				underTest.loadMap.calls.reset();
				underTest.publishMap('2foo');
				expect(underTest.loadMap).toHaveBeenCalledWith('2foo', true);
			});
			it('should reload only once, and stop reloading after', function () {
				underTest.publishMap('1foo');
				underTest.publishMap('2foo');
				underTest.loadMap.calls.reset();
				underTest.publishMap('2foo');
				expect(underTest.loadMap).not.toHaveBeenCalled();
			});
			it('should not reload if a different map was loaded between saving', function () {
				underTest.publishMap('1foo');
				underTest.loadMap('2foo');
				underTest.loadMap.calls.reset();
				underTest.publishMap('2foo');
				expect(underTest.loadMap).not.toHaveBeenCalled();
			});
		});
	});
});
