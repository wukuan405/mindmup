/*global runs, waitsFor, describe, it, $, window, expect, beforeEach, afterEach, MM*/
describe('MM.BrowserContainer', function () {
	'use strict';
	var container = new MM.BrowserContainer();
  describe('storage', function () {
    it("removes item from local storage on removeItem", function () {
      localStorage.setItem('x','y');
      container.storage.removeItem('x');
      expect(localStorage.getItem('x')).toBeNull();
    });
    it("sets an item in local storage on setItem", function () {
      localStorage.removeItem('x');
      container.storage.setItem('x','y');
      expect(localStorage.getItem('x')).toBe('y');
    });
    it("provides a deferred interface for errors on setItem", function () {
			var longItem = new Array(5000000).join('a'),
        failed = jasmine.createSpy('storage failed');
      container.storage.setItem('x',longItem).fail(failed);
      expect(failed).toHaveBeenCalled();
    });
    it("provides a deferred interface to get an item from local storage", function () {
      var result;
      localStorage.setItem('x','z');
      container.storage.getItem('x').done(function(res) { result = res; });
      expect(result).toBe('z');
    });
  });
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
