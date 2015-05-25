/*global jasmine, _, observable, beforeEach, describe, expect, it, jasmine, jQuery, spyOn, MM, window*/
describe('Bookmarks', function () {
	'use strict';
	beforeEach(function () {
		window.location.hash = '';
	});
	describe('Magic bookmark manager', function () {
		describe('store', function () {
			var mapController, bookmark, url;
			beforeEach(function () {
				mapController  =  observable({});
				bookmark  =  new MM.Bookmark(mapController);
				url = {mapId: 'abcd', title: 'defh'};
			});
			it('should invoke store method when mapController dispatches Before Upload event', function () {
				bookmark.store(url);
				expect(bookmark.list()).toEqual([url]);
			});
			it('should store a read only copy of a bookmark', function () {
				bookmark.store(url);
				var original = url.title;
				url.title = 'new';
				expect(bookmark.list()[0].title).toEqual(original);
			});
			it('should store different bookmarks ordered by recency', function () {
				var url2 = {mapId: 'xkcd', title: 'ssss'};
				bookmark.store(url);
				bookmark.store(url2);
				expect(bookmark.list()).toEqual([url2, url]);
			});
			it('should update a bookmark if one with the same title already exists', function () {
				var updated = {mapId:  'xxx', title:  url.title};
				bookmark.store(url);
				bookmark.store(updated);
				expect(_.size(bookmark.list())).toBe(1);
				expect(bookmark.list()[0]).toEqual(updated);
			});
			it('should update a bookmark if one with the same id already exists', function () {
				var url = {mapId:  'xxx', title:  'old'},
					updated = {mapId:  'xxx', title:  'new'};
				bookmark.store(url);
				bookmark.store(updated);
				expect(_.size(bookmark.list())).toBe(1);
				expect(bookmark.list()[0]).toEqual(updated);
			});
			it('fails if mapId or title are not provided', function () {
				bookmark.store(url);
				expect(function () {
					bookmark.store({title: 'zeka'});
				}).toThrow(new Error('Invalid bookmark'));
				expect(function () {
					bookmark.store({mapId: 'zeka'});
				}).toThrow(new Error('Invalid bookmark'));
				expect(function () {
					bookmark.store({mapId:  '', title: 'zeka'});
				}).toThrow(new Error('Invalid bookmark'));
				expect(function () {
					bookmark.store({mapId: 'zeka', title: ''});
				}).toThrow(new Error('Invalid bookmark'));
				expect(_.size(bookmark.list())).toBe(1);
				expect(bookmark.list()[0]).toEqual(url);
			});
			it('should save bookmarks to storage on store if provided', function () {
				var url = {mapId: 'abc', title: 'def'}, bookmark,
					storage = {getItem: function () {
						return [];
					}, setItem:  function () {}};

				spyOn(storage, 'setItem');
				bookmark = new MM.Bookmark(observable({}), storage, 'book');
				bookmark.store(url);
				expect(storage.setItem).toHaveBeenCalledWith('book', [url]);
			});
			it('should dispatch a added event', function () {
				var url = {mapId: 'abc', title: 'def'},
					bookmark = new MM.Bookmark(observable({})),
					listener = jasmine.createSpy('removed');
				bookmark.addEventListener('added', listener);
				bookmark.store(url);
				expect(listener).toHaveBeenCalledWith(url);
			});
		});
		describe('remove', function () {
			it('removes a bookmark by mapId', function () {
				var bookmark = new MM.Bookmark(observable({})), remaining = {mapId: 'xx2', title: 'yy2'};
				bookmark.store({mapId: 'xx', title: 'yy'});
				bookmark.store(remaining);
				bookmark.remove('xx');
				expect(bookmark.list()).toEqual([remaining]);
			});
			it('stores the list to external storage if defined', function () {
				var url = {mapId: 'abc', title: 'def'}, bookmark,
					storage = {getItem: function () {
						return [];
					}, setItem:  function () {}};
				bookmark = new MM.Bookmark(observable({}), storage, 'book');
				bookmark.store(url);
				bookmark.store({mapId: 'xx', title: 'yy'});
				spyOn(storage, 'setItem');
				bookmark.remove('xx');
				expect(storage.setItem).toHaveBeenCalledWith('book', [url]);
			});
			it('fires a change event when a bookmark is deleted', function () {
				var bookmark = new MM.Bookmark(observable({})),
					mark = {mapId: 'xx', title: 'yy'},
					listener = jasmine.createSpy('removed');
				bookmark.store(mark);
				bookmark.addEventListener('deleted', listener);
				bookmark.remove('xx');
				expect(listener).toHaveBeenCalledWith(mark, false);
			});
		});
		it('should return a read-only copy of the list', function () {
			var bookmark = new MM.Bookmark(observable({})), original, modified;
			bookmark.store({mapId: 'xx', title: 'yy'});
			original = bookmark.list();
			modified = bookmark.list();
			modified.push(1);
			expect(bookmark.list()).toEqual(original);
			expect(bookmark.list()).not.toEqual(modified);
		});
		it('should load from storage on init if provided', function () {
			var url = {mapId: 'abc', title: 'def'},
				storage = {
					getItem: function (item) {
						if (item === 'book') {
							return [url];
						}
					}
				},
				bookmark = new MM.Bookmark(observable({}), storage, 'book');
			expect(bookmark.list()).toEqual([url]);
		});
		it('should ignore storage if it does not contain a bookmark store', function () {
			var storage = {getItem: function () {}},
				bookmark = new MM.Bookmark(observable({}), storage, 'book');
			expect(bookmark.list()).toEqual([]);
		});


		it('converts a list of bookmarks to links by appending /map and cutting down long titles', function () {
			var bookmark = new MM.Bookmark(observable({}));
			bookmark.store({mapId: 'u1', title: 'this is a very very long title indeed and should not be displayed in full, instead it should be cut down'});
			expect(bookmark.links()).toEqual([{
				title: 'this is a very very long title indeed and should not be displayed in full, instead it should be cut down',
				shortTitle: 'this is a very very long title...',
				mapId: 'u1'
			}]);
		});
		it('automatically bookmarks all saved maps', function () {
			var	mapController  =  observable({}),
				bookmark  =  new MM.Bookmark(mapController);
			mapController.dispatchEvent('mapSaved', 'key', {title: 'title'});
			expect(bookmark.list()).toEqual([{mapId: 'key', title: 'title'}]);
		});
		it('automatically bookmarks all saved maps', function () {
			var	mapController  =  observable({}),
				bookmark  =  new MM.Bookmark(mapController);
			mapController.dispatchEvent('mapSaved', 'key', {title: 'title'});
			expect(bookmark.list()).toEqual([{mapId: 'key', title: 'title'}]);
		});

		describe('pin', function () {
			var mapController, bookmark;
			beforeEach(function () {
				mapController  =  observable({});
				bookmark  =  new MM.Bookmark(mapController);
			});
			it('stores the currently loaded map if not already stored', function () {
				mapController.dispatchEvent('mapLoaded', 'mapKey', {title: 'title'});
				bookmark.pin();
				expect(bookmark.list()).toEqual([{mapId: 'mapKey', title: 'title'}]);
			});
			it('does nothing if a map is not loaded', function () {
				bookmark.pin();
				expect(bookmark.list()).toEqual([]);
			});
		});
		describe('canPin', function () {
			var mapController, bookmark;
			beforeEach(function () {
				mapController  =  observable({});
				bookmark  =  new MM.Bookmark(mapController);
			});
			it('returns true if current map is not in bookmarks', function () {
				mapController.dispatchEvent('mapLoaded', 'mapKey', {title: 'title'});
				expect(bookmark.canPin()).toBeTruthy();
			});
			it('returns false if current map is not in bookmarks', function () {
				bookmark.store({mapId: 'mapKey', title: 'title'});
				mapController.dispatchEvent('mapLoaded', 'mapKey', {title: 'title'});
				expect(bookmark.canPin()).toBeFalsy();
			});
			it('returns false if no map is loaded', function () {
				expect(bookmark.canPin()).toBeFalsy();
			});
			it('fires pinChanged when a new map is loaded if it is pinnable', function () {
				var spy = jasmine.createSpy('pinChanged');
				bookmark.addEventListener('pinChanged', spy);
				mapController.dispatchEvent('mapLoaded', {title: 'title'}, 'key');
				expect(spy).toHaveBeenCalled();
			});
			it('does not fire pinChanged when a new map is loaded if it is not pinnable', function () {
				var spy = jasmine.createSpy('pinChanged');
				bookmark.store({mapId: 'mapKey', title: 'title'});
				bookmark.addEventListener('pinChanged', spy);
				mapController.dispatchEvent('mapLoaded', 'mapKey', {title: 'title'});
				expect(spy).not.toHaveBeenCalled();
			});
		});
	});


	describe('Bookmark widget', function () {
		var ulTemplate = '<ul><li data-mm-role="bookmark">Old</li><li class="template" style="display: none"><a data-category="Top Bar" data-event-type="Bookmark click"><span data-mm-role="x"></span></a></li></ul>',
			wrap = function (list, repo) {
				repo = repo || observable({});
				return new MM.Bookmark(repo, { getItem: function () {
					return list;
				}, setItem: function () { } }, 'key');
			};
		it('does not remove previous content if the bookmark list is empty', function () {
			var list = jQuery(ulTemplate).bookmarkWidget(wrap([]));
			expect(list.children('li').length).toBe(1);
			expect(list.children('li').first().text()).toBe('Old');
		});
		it('removes previous content if the list is not empty', function () {
			var list = jQuery(ulTemplate).bookmarkWidget(wrap([{mapId: 'x', title: 'y'}]));
			expect(list.children('li').length).toBe(1);
			expect(list.children('li').first().children().first()).toHaveTagName('a');
		});
		it('adds repository class to hyperlinks based on map ID', function () {
			var list = jQuery(ulTemplate).bookmarkWidget(wrap([{mapId: 'xabc', title: 'y'}]));
			expect(list.children('li').length).toBe(1);
			expect(list.children('li').first().children().first().hasClass('repo-x')).toBeTruthy();
		});
		it('links are listed in reverse order as hyperlinks', function () {
			var links = [{mapId: 'u1', title: 't1'},
				{mapId: 'u2', title: 't2'},
				{mapId: 'u3', title: 't3'}],
				list = jQuery(ulTemplate).bookmarkWidget(wrap(links));
			expect(list.children('li').length).toBe(3);
			expect(list.children('li').first().children('a').text()).toBe('t3');
			expect(list.children('li').last().children('a').text()).toBe('t1');
		});
		it('self-updates if a bookmark is deleted', function () {
			var links = [{mapId: 'u1', title: 't1'},
				{mapId: 'u2', title: 't2'},
				{mapId: 'u3', title: 't3'}],
				bookmark = wrap(links),
				list = jQuery(ulTemplate).bookmarkWidget(bookmark);
			bookmark.remove('u1');
			expect(list.children('li').length).toBe(2);
			expect(list.children('li').first().children('a').text()).toBe('t3');
			expect(list.children('li').last().children('a').text()).toBe('t2');
		});
		it('self-updates if a bookmark is added', function () {
			var	bookmark = wrap([]),
				list = jQuery(ulTemplate).bookmarkWidget(bookmark);
			bookmark.store({mapId: 'u1', title: 't1'});
			expect(list.children('li').length).toBe(1);
			expect(list.children('li').last().children('a').text()).toBe('t1');
		});
		it('puts back original content when all bookmarks are removed', function () {
			var links = [{mapId: 'u1', title: 't1'}],
				bookmark = wrap(links),
				list = jQuery(ulTemplate).bookmarkWidget(bookmark);
			bookmark.remove('u1');
			expect(list.children('li').length).toBe(1);
			expect(list.children('li').first().text()).toBe('Old');
		});
		it('displays only first 10 links', function () {
			var links = [], list, idx;
			for (idx = 0; idx < 12; idx++) {
				links.push({mapId: 'u' + idx, title: 't' + idx});
			}
			list = jQuery(ulTemplate).bookmarkWidget(wrap(links));
			expect(list.children('li').length).toBe(10);
		});
		it('preserves any children in the link', function () {
			var list = jQuery(ulTemplate).bookmarkWidget(wrap([{mapId: 'x', title: 'y'}]));
			expect(list.children('li').first().children().first().children()).toHaveTagName('span');
		});
		it('preserves any elements without data-mm-role=bookmark', function () {
			var list = jQuery(ulTemplate).prepend('<li>Keep me</li><li data-mm-role="bookmark">Do not keep me</li>');
			list.bookmarkWidget(wrap([{mapId: 'x', title: 'y'}]));
			expect(list.children('li').first().text()).toBe('Keep me');
		});
		it('hides parent of elements with data-mm-role=bookmark-pin if map is not pinnable', function () {
			var list = jQuery(ulTemplate).prepend('<li>Keep me</li><li id="bkm"><a data-mm-role="bookmark-pin">Pin me</a></li>'),
				bookmark = wrap([{mapId: 'x', title: 'y'}]);
			spyOn(bookmark, 'canPin').and.returnValue(false);
			list.bookmarkWidget(bookmark);
			expect(list.children('li[id=bkm]').css('display')).toBe('none');
		});
		it('self-updates when the pinnable status changes', function () {
			var list = jQuery(ulTemplate).prepend('<li>Keep me</li><li id="bkm"><a data-mm-role="bookmark-pin">Pin me</a></li>'),
				repo = observable({}),
				bookmark = wrap([{mapId: 'x', title: 'y'}], repo);
			spyOn(bookmark, 'canPin').and.returnValue(false);
			list.bookmarkWidget(bookmark);
			repo.dispatchEvent('mapLoaded', 'another', {title: 'z'});
			expect(list.children('li[id=bkm]').css('display')).toBe('none');

		});
		it('attaches a click event on any links inside data-mm-role=bookmark-pin that call bookmark.pin', function () {
			var list = jQuery(ulTemplate).prepend('<li><a data-mm-role="bookmark-pin" href="#">Pin Me</a></li>'),
				bookmark = wrap([{mapId: 'x', title: 'y'}]);
			spyOn(bookmark, 'canPin').and.returnValue(true);
			list.bookmarkWidget(bookmark);
			spyOn(bookmark, 'pin');
			list.children('li').first().find('a').click();
			expect(bookmark.pin).toHaveBeenCalled();
		});
	});
});
