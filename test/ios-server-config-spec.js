/*global MM, describe, it, beforeEach, expect, jasmine*/

describe('MM.IOS.ServerConfig', function () {
	'use strict';
	var underTest, storage;
	beforeEach(function () {
		storage = jasmine.createSpyObj('storage', ['setItem', 'getItem']);
		underTest = new MM.IOS.ServerConfig(storage);
	});
	describe('handlesCommand', function () {
		it('returns true if command.type is config:set', function () {
			expect(underTest.handlesCommand({type: 'config:set'})).toBeTruthy();
		});
		it('returns false if command.type is undefined', function () {
			expect(underTest.handlesCommand({typeo: 'config:set'})).toBeFalsy();
		});
		it('returns false if command type is undefined', function () {
			expect(underTest.handlesCommand()).toBeFalsy();
		});
		it('returns false if command.type is not config:set', function () {
			expect(underTest.handlesCommand({type: 'foo:bar'})).toBeFalsy();
		});
	});
	describe('handleCommand', function () {
		describe('when the config is different from the stored config', function () {
			beforeEach(function () {
				storage.getItem.and.returnValue({'goldApiUrl':'bbb'});
			});
			it('should store config in localStorage', function () {
				underTest.handleCommand({type: 'config:set', args: [{'goldApiUrl':'ccc'}]});
				expect(storage.setItem).toHaveBeenCalledWith('ios-config', {'goldApiUrl':'ccc'});
			});
			it('should dispatch config changed event', function () {
				var listener = jasmine.createSpy('listener');
				underTest.addEventListener('config:set', listener);

				underTest.handleCommand({type: 'config:set', args: [{'goldApiUrl':'ccc'}]});
				expect(listener).toHaveBeenCalledWith({'goldApiUrl':'ccc'});
			});
		});
		describe('when the config is the same as the stored config', function () {
			beforeEach(function () {
				storage.getItem.and.returnValue({'goldApiUrl':'ccc'});
			});
			it('should not store config in localStorage', function () {
				underTest.handleCommand({type: 'config:set', args: [{'goldApiUrl':'ccc'}]});
				expect(storage.setItem).not.toHaveBeenCalled();
			});
			it('should not dispatch config changed event', function () {
				var listener = jasmine.createSpy('listener');
				underTest.addEventListener('config:set', listener);

				underTest.handleCommand({type: 'config:set', args: [{'goldApiUrl':'ccc'}]});
				expect(listener).not.toHaveBeenCalled();
			});
			it('should set local storageItem to undefined if there are no args', function () {
				underTest.handleCommand({type: 'config:set'});
				expect(storage.setItem).toHaveBeenCalledWith('ios-config', undefined);
			});
			it('should set local storageItem to undefined if there are empty args', function () {
				underTest.handleCommand({type: 'config:set', args: []});
				expect(storage.setItem).toHaveBeenCalledWith('ios-config', undefined);
			});
			it('should set local storageItem to undefined if there is a false arg', function () {
				underTest.handleCommand({type: 'config:set', args: [false]});
				expect(storage.setItem).toHaveBeenCalledWith('ios-config', undefined);
			});
		});
		describe('when stored config is undefined', function () {
			it('should not set local storageItem if there are no args', function () {
				underTest.handleCommand({type: 'config:set'});
				expect(storage.setItem).not.toHaveBeenCalled();
			});
			it('should not set local storageItem if there are empty args', function () {
				underTest.handleCommand({type: 'config:set', args: []});
				expect(storage.setItem).not.toHaveBeenCalled();
			});
			it('should not set local storageItem if there is a false arg', function () {
				underTest.handleCommand({type: 'config:set', args: [false]});
				expect(storage.setItem).not.toHaveBeenCalled();
			});

		});
	});
	describe('valueForKey', function () {
		it('should return the stored value for the key', function () {
			storage.getItem.and.returnValue({goldApiUrl:'ccc'});
			expect(underTest.valueForKey('goldApiUrl')).toEqual('ccc');
		});
		it('should return nil for undefined key', function () {
			storage.getItem.and.returnValue({goldApiUrl:'ccc'});
			expect(underTest.valueForKey('goldApiUrl1')).toBeFalsy();
		});
		it('should return nil when there is no stored config', function () {
			storage.getItem.and.returnValue(undefined);
			expect(underTest.valueForKey('goldApiUrl')).toBeFalsy();
		});
		it('should return the default value if there is no stored value for a key', function () {
			underTest = new MM.IOS.ServerConfig(storage, {goldApiUrl: 'foo'});
			storage.getItem.and.returnValue(undefined);
			expect(underTest.valueForKey('goldApiUrl')).toEqual('foo');
		});
	});
});
