/*global MM,describe, it, expect, beforeEach, jasmine */
describe('MM.LocalStorageClipboard', function () {
	'use strict';
	var underTest, storage, alertController;
	beforeEach(function () {
		storage = jasmine.createSpyObj('storage', ['setItem', 'getItem']);
		alertController = jasmine.createSpyObj('alert', ['show']);
		underTest = new MM.LocalStorageClipboard(storage, 'key-1', alertController);
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
	});
});
