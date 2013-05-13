/*global describe, expect, it, MM, beforeEach, afterEach*/
describe("MM.Extensions", function () {
	'use strict';
	var oldConfig;
	beforeEach(function () {
		oldConfig = MM.Extensions.config;
	});
	afterEach(function () {
		MM.Extensions.config = oldConfig;
	});
	describe("scriptsToLoad", function () {
		it("includes scripts from config that are set in the storage key", function () {
			MM.Extensions.config = { 'abc': { script: '/abc.js' }, 'def': {script: '/def.js'}};
			var ext = new MM.Extensions({'extkey': 'abc def'}, 'extkey');
			expect(ext.scriptsToLoad()).toEqual(['/abc.js', '/def.js']);
		});
		it("excludes scripts from config that are not set in the storage key", function () {
			MM.Extensions.config = { 'abc': { script: '/abc.js' }, 'def': {script: '/def.js'}};
			var ext = new MM.Extensions({'extkey': 'abc'}, 'extkey');
			expect(ext.scriptsToLoad()).toEqual(['/abc.js']);
		});
	});
	describe("setActive", function () {
		var storage, key = 'storekey';
		beforeEach(function () {
			storage = {};
		});
		it("activates an extension if second arg is true", function () {
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', true);
			expect(storage[key]).toBe('ttt');
		});
		it("doesn't deactivate other active extensions", function () {
			storage[key] = 'abc';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', true);
			expect(storage[key]).toBe('abc ttt');
		});
		it("doesn't activate already active extensions", function () {
			storage[key] = 'abc ttt';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', true);
			expect(storage[key]).toBe('abc ttt');
		});
		it("deactivates an extension if second arg is false", function () {
			storage[key] = 'ttt';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', false);
			expect(storage[key]).toBe('');
		});
		it("doesn't deactivate other active extensions", function () {
			storage[key] = 'abc ttt';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', false);
			expect(storage[key]).toBe('abc');
		});
		it("doesn't deactivate already inactive extensions", function () {
			storage[key] = 'abc';
			var ext = new MM.Extensions(storage, key);
			ext.setActive('ttt', false);
			expect(storage[key]).toBe('abc');
		});

	});
});
