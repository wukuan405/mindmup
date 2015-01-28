/*global describe, expect, it, MM, beforeEach, afterEach, jasmine*/
describe('MM.Extensions', function () {
	'use strict';
	var oldConfig;
	beforeEach(function () {
		oldConfig = MM.Extensions.config;
	});
	afterEach(function () {
		MM.Extensions.config = oldConfig;
	});
	describe('scriptsToLoad', function () {
		it('includes scripts from config that are set in the storage key and prepends the cache prevention key as version', function () {
			MM.Extensions.config = { 'abc': { script: '/abc.js' }, 'def': {script: '/def.js'}};
			var ext = new MM.Extensions({'extkey': 'abc def'}, 'extkey', {publicUrl: '/cacheKey'});
			expect(ext.scriptsToLoad()).toEqual(['/cacheKey/abc.js', '/cacheKey/def.js']);
		});
		it('does not touch external URLs', function () {
			MM.Extensions.config = { 'abc': { script: 'https://x/abc.js' }, 'def': {script: 'http://y/def.js'}};
			var ext = new MM.Extensions({'extkey': 'abc def'}, 'extkey', {publicUrl: '/cacheKey'});
			expect(ext.scriptsToLoad()).toEqual(['https://x/abc.js', 'http://y/def.js']);
		});
		it('supports multiple scripts for an extension', function () {
			MM.Extensions.config = { 'abc': { script: '/abc.js /def.js' }};
			var ext = new MM.Extensions({'extkey': 'abc'}, 'extkey', {publicUrl: '/cacheKey'});
			expect(ext.scriptsToLoad()).toEqual(['/cacheKey/abc.js', '/cacheKey/def.js']);
		});
		it('excludes scripts from config that are not set in the storage key', function () {
			MM.Extensions.config = { 'abc': { script: '/abc.js' }, 'def': {script: '/def.js'}};
			var ext = new MM.Extensions({'extkey': 'abc'}, 'extkey', {publicUrl: '/cacheKey'});
			expect(ext.scriptsToLoad()).toEqual(['/cacheKey/abc.js']);
		});
		it('excludes scripts from storage that are not in the config', function () {
			MM.Extensions.config = { 'abc': { script: '/abc.js' }, 'def': {script: '/def.js'}};
			var ext = new MM.Extensions({'extkey': 'abc xyz'}, 'extkey', {publicUrl: '/cacheKey'});
			expect(ext.scriptsToLoad()).toEqual(['/cacheKey/abc.js']);
		});
		it('includes inactive scripts that provide support for the given map ID', function () {
			MM.Extensions.config = { 'abc': { script: '/abc.js' }, 'def': {script: '/def.js', providesMapId: function (mapId) {
				return mapId === 'xxxx';
			}}};
			var ext = new MM.Extensions({'extkey': 'abc'}, 'extkey', {publicUrl: '/cacheKey'});
			expect(ext.scriptsToLoad()).toEqual(['/cacheKey/abc.js']);
			expect(ext.scriptsToLoad('xxxx')).toEqual(['/cacheKey/abc.js', '/cacheKey/def.js']);
			expect(ext.scriptsToLoad('yyyy')).toEqual(['/cacheKey/abc.js']);
		});
		it('does not load twice active extensions that provide a map id', function () {
			MM.Extensions.config = { 'abc': { script: '/abc.js' }, 'def': {script: '/def.js', providesMapId: function (mapId) {
				return mapId === 'xxxx';
			}}};
			var ext = new MM.Extensions({'extkey': 'abc def'}, 'extkey', {publicUrl: '/cacheKey'});
			expect(ext.scriptsToLoad('xxxx')).toEqual(['/cacheKey/abc.js', '/cacheKey/def.js']);
		});
	});
	describe('setActive', function () {
		var storage, key = 'storekey';
		beforeEach(function () {
			storage = {};
		});
		it('activates an extension if second arg is true', function () {
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', true);
			expect(storage[key]).toBe('ttt');
		});
		it('does not deactivate other active extensions', function () {
			storage[key] = 'abc';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', true);
			expect(storage[key]).toBe('abc ttt');
		});
		it('does not activate already active extensions', function () {
			storage[key] = 'abc ttt';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', true);
			expect(storage[key]).toBe('abc ttt');
		});
		it('deactivates an extension if second arg is false', function () {
			storage[key] = 'ttt';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', false);
			expect(storage[key]).toBe('');
		});
		it('does not deactivate other active extensions', function () {
			storage[key] = 'abc ttt';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', false);
			expect(storage[key]).toBe('abc');
		});
		it('does not deactivate already inactive extensions', function () {
			storage[key] = 'abc';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', false);
			expect(storage[key]).toBe('abc');
		});
		it('sends a notification to activityLog that an extension has been turned on', function () {
			var al = {},
				ext = new MM.Extensions(storage, key, {}, {activityLog: al});
			al.log = jasmine.createSpy();
			ext.setActive('extension name', true);
			expect(al.log).toHaveBeenCalledWith('Extensions', 'extension name', 'act-true');
		});
	});
	describe('isActive', function () {
		it('returns true for active extensions, false for inactive', function () {
			var key = 'sk', storage = {'sk': 'ttt abc'}, ext = new MM.Extensions(storage, key);
			expect(ext.isActive('abc')).toBeTruthy();
			expect(ext.isActive('ttt')).toBeTruthy();
			expect(ext.isActive('def')).toBeFalsy();
		});
	});
});
