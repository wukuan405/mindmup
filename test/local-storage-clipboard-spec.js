/*global MM,describe, it, expect, beforeEach, jasmine */
describe('MM.LocalStorageClipboard', function () {
	'use strict';
	var underTest, storage, alertController, resourceHandler;
	beforeEach(function () {
		storage = jasmine.createSpyObj('storage', ['setItem', 'getItem']);
		alertController = jasmine.createSpyObj('alert', ['show']);
		resourceHandler = jasmine.createSpyObj('resourceHandler', ['getResource', 'storeResource']);
		resourceHandler.storeResource.and.callFake(function (internalUrl) {
			return 'int:' + internalUrl;
		});
		resourceHandler.getResource.and.callFake(function (internalUrl) {
			return 'ext:' + internalUrl;
		});
		underTest = new MM.LocalStorageClipboard(storage, 'key-1', alertController, resourceHandler);
	});
	describe('put', function () {
		it('stores items into local storage by key', function () {
			underTest.put('23456789');
			expect(storage.setItem).toHaveBeenCalledWith('key-1', '23456789');
		});
		it('shows an alert when storage runs out of space', function () {
			storage.setItem.and.throwError('xx');
			underTest.put('23456789');
			expect(alertController.show).toHaveBeenCalledWith('Clipboard error', jasmine.any(String), 'error');
		});
		describe('resource handling', function () {
			it('replaces icon URLs in a single node', function () {
				underTest.put({title:'xx', attr:{icon:{url:'internal/1'}}});
				expect(storage.setItem).toHaveBeenCalledWith('key-1', {title:'xx', attr:{icon:{url:'ext:internal/1'}}});
			});
			it('replaces icon URLs in an array of nodes', function () {
				underTest.put([{title:'xx', attr:{icon:{url:'internal/1'}}}, {title:'xy', attr:{icon:{url:'internal/2'}}}]);
				expect(storage.setItem).toHaveBeenCalledWith('key-1', [{title:'xx', attr:{icon:{url:'ext:internal/1'}}}, {title:'xy', attr:{icon:{url:'ext:internal/2'}}}]);

			});
			it('replaces icon URLs in a hierarchy of nodes', function () {
				underTest.put({title:'xx', attr:{icon:{url:'internal/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'internal/2'}}}}});
				expect(storage.setItem).toHaveBeenCalledWith('key-1', {title:'xx', attr:{icon:{url:'ext:internal/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'ext:internal/2'}}}}});
			});
			it('replaces icon URLs in an array of hierarchies of nodes', function () {
				underTest.put([{title:'xx', attr:{icon:{url:'internal/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'internal/2'}}}}}]);
				expect(storage.setItem).toHaveBeenCalledWith('key-1', [{title:'xx', attr:{icon:{url:'ext:internal/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'ext:internal/2'}}}}}]);
			});
		});
	});
	describe('get', function () {
		it('asks the storage for the key', function () {
			underTest.get();
			expect(storage.getItem).toHaveBeenCalledWith('key-1');
		});
		it('returns undefined if nothing is saved', function () {
			storage.getItem.and.returnValue(undefined);
			expect(underTest.get()).toBeUndefined();
		});
		it('returns saved content as object if it is saved', function () {
			storage.getItem.and.returnValue([1, 2, 'c', {d: 1}]);
			expect(underTest.get()).toEqual([1, 2, 'c', {d: 1}]);
		});
		it('returns same object multiple times if asked for', function () {
			storage.getItem.and.returnValue([1, 2, 'c', {d: 1}]);
			underTest.get();

			expect(underTest.get()).toEqual([1, 2, 'c', {d: 1}]);
		});
		describe('resource handling', function () {
			it('replaces icon URLs in a single node', function () {
				storage.getItem.and.returnValue({title:'xx', attr:{icon:{url:'external/1'}}});
				expect(underTest.get()).toEqual({title:'xx', attr:{icon:{url:'int:external/1'}}});
			});
			it('replaces icon URLs in an array of nodes', function () {
				storage.getItem.and.returnValue([{title:'xx', attr:{icon:{url:'external/1'}}}, {title:'xy', attr:{icon:{url:'external/2'}}}]);
				expect(underTest.get()).toEqual([{title:'xx', attr:{icon:{url:'int:external/1'}}}, {title:'xy', attr:{icon:{url:'int:external/2'}}}]);
			});
			it('replaces icon URLs in a hierarchy of nodes', function () {
				storage.getItem.and.returnValue({title:'xx', attr:{icon:{url:'external/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'external/2'}}}}});
				expect(underTest.get()).toEqual({title:'xx', attr:{icon:{url:'int:external/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'int:external/2'}}}}});

			});
			it('replaces icon URLs in an array of hierarchies of nodes', function () {
				storage.getItem.and.returnValue([{title:'xx', attr:{icon:{url:'external/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'external/2'}}}}}]);
				expect(underTest.get()).toEqual([{title:'xx', attr:{icon:{url:'int:external/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'int:external/2'}}}}}]);
			});
			it('skips translation if called with true', function () {
				storage.getItem.and.returnValue([{title:'xx', attr:{icon:{url:'external/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'external/2'}}}}}]);
				expect(underTest.get(true)).toEqual([{title:'xx', attr:{icon:{url:'external/1'}}, ideas: {2: {title:'xy', attr:{icon:{url:'external/2'}}}}}]);
			});
		});
	});
});
