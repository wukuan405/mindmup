/*global runs, waitsFor, describe, it, $, window, expect, beforeEach, afterEach, MM*/
describe('MM.BrowserContainer', function () {
	'use strict';
	var container = new MM.BrowserContainer();
	describe('Class caching wizard', function () {
		var underTest;
		beforeEach(function () {
			underTest = $('<span id="testX" class="a b c d"/>').appendTo('body');
		});
		afterEach(function () {
			underTest.remove();
		});
		it('automatically saves all classes from the target element to local storage on window unload', function () {
			var store = {};
			container.classCachingWidget($('#testX'), 'cached-classes', store);
			$(window).unload();
			expect(store['cached-classes-#testX']).toBe('a b c d');
		});
		it('automatically adds all classes from local storage to the target element', function () {
			var store = {'cached-classes-#testX': 'x y z'};
			container.classCachingWidget($('#testX'), 'cached-classes', store);
			expect(underTest.hasClass('x y z')).toBeTruthy();
		});
		it('does nothing when storage is empty', function () {
			var store = {};
			container.classCachingWidget($('#testX'), 'cached-classes', store);
			expect(underTest.hasClass('a b c d')).toBeTruthy();
		});
	});
});
describe('MM.ChromeContainer', function () {
	'use strict';
	var container = new MM.ChromeAppContainer();
	describe('Class caching wizard', function () {
		var underTest, store;
		beforeEach(function () {
			underTest = $('<span id="testX" class="a b c d"/>').appendTo('body');
			store = {
				map: {},
				setItem: function (key, value) {
					store.map[key] = value;
				},
				getItem: function (key) {
					return {
						done: function (callback) {
							callback(store.map[key]);
						}
					};
				}
			};
		});
		afterEach(function () {
			underTest.remove();
		});
		it('automatically saves all classes from the target element to local storage on class change', function () {
			var key = 'cached-classes-#testX';
			console.log('0', store.map[key]);
			container.classCachingWidget($('#testX'), 'cached-classes', store);
			console.log('1', store.map[key]);
			$('#testX').addClass('e');
			console.log('2', store.map[key]);
			runs(function () {
				waitsFor(function () {
					return store.map[key];
				}, 'mutator', 1000);
			});
			runs(function () {
				expect(store.map[key]).toBe('a b c d e');
			});
		});
		it('automatically adds all classes from local storage to the target element', function () {
			store.map['cached-classes-#testX'] = 'x y z';
			container.classCachingWidget($('#testX'), 'cached-classes', store);
			expect(underTest.hasClass('x y z')).toBeTruthy();
		});
		it('does nothing when storage is empty', function () {
			container.classCachingWidget($('#testX'), 'cached-classes', store);
			expect(underTest.hasClass('a b c d')).toBeTruthy();
		});
	});
});
