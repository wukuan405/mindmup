/*global beforeEach, describe, expect, it, spyOn, MM*/
describe('JSONStorage', function () {
	'use strict';
	var json, storage;
	beforeEach(function () {
		storage = {getItem: function () {}, setItem:  function () {}, removeItem: function () {}};
		json = new MM.JsonStorage(storage);
	});
	it('stringifies items past into setItem before passing on', function () {
		spyOn(storage, 'setItem');
		json.setItem('bla', {a: 'b'});
		expect(storage.setItem).toHaveBeenCalledWith('bla', '{"a":"b"}');
	});
	it('destringifies items from getItem after delegation', function () {
		storage.getItem = function () {
			return '{"a": "b"}';
		};
		//spyOn(storage, 'getItem').and.callThrough();
		var result = json.getItem('bla');
		expect(result).toEqual({a: 'b'});
	});
	it('returns undefined if the item is not JSON', function () {
		storage.getItem = function () {
			return '{xxxxxx}';
		};
		var item = json.getItem('bla');
		expect(item).toBeUndefined();
	});
	it('removes item when remove method is invoked', function () {
		spyOn(storage, 'removeItem');
		json.remove('key');
		expect(storage.removeItem).toHaveBeenCalledWith('key');
	});
	describe('removeKeysWithPrefix', function () {
		beforeEach(function () {
			storage['not-foo-1'] = 'a';
			storage['foo-1'] = 'a';
			storage['foo-2'] = 'b';
			storage.foo = 'c';
			spyOn(storage, 'removeItem');
		});
		it('returns the number of keys removed', function () {
			var result = json.removeKeysWithPrefix('foo');
			expect(result).toBe(3);
			expect(storage.removeItem.calls.count()).toBe(3);
		});
		it('removes keys with a prefix', function () {
			json.removeKeysWithPrefix('foo');
			expect(storage.removeItem).toHaveBeenCalledWith('foo-1');
			expect(storage.removeItem).toHaveBeenCalledWith('foo-2');
			expect(storage.removeItem).toHaveBeenCalledWith('foo');
		});
		it('returns 0 if no matching keys were found', function () {
			var result = json.removeKeysWithPrefix('bar');
			expect(result).toBe(0);
			expect(storage.removeItem).not.toHaveBeenCalled();
		});
		it('should never match on an empty prefix', function () {
			var result = json.removeKeysWithPrefix('');
			expect(result).toBe(0);
			expect(storage.removeItem).not.toHaveBeenCalled();
		});
		it('should never match on an undefined prefix', function () {
			var result = json.removeKeysWithPrefix('');
			expect(result).toBe(0);
			expect(storage.removeItem).not.toHaveBeenCalled();
		});
	});
});
