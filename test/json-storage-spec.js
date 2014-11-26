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
});
