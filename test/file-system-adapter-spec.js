/*global MM, MAPJS, describe, it, beforeEach, afterEach, jQuery, expect, jasmine */
describe("MM.FileSystemAdapter", function () {
	'use strict';
	describe("loadMap", function () {
		var fakeFS = function (content, contentType, allowUpdate) {
			return {
				loadMap: function (mapId) {
					return jQuery.Deferred().resolve(content, mapId, contentType, allowUpdate).promise();
				},
				notSharable: true
			};
		};
		it("delegates to fileSystem and converts content before resolving", function () {
			var map = {id: 1, title: "X"},
				underTest = new MM.FileSystemAdapter(fakeFS(JSON.stringify(map), 'application/json', true)),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, notSharable, allowUpdate) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
				expect(mapId).toBe("abc");
				expect(notSharable).toBeTruthy();
				expect(allowUpdate).toBeTruthy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it("delegates to fileSystem and converts content before resolving", function () {
			var map = {id: 1, title: "X"},
				underTest = new MM.FileSystemAdapter(fakeFS(JSON.stringify(map), 'application/json', true)),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, notSharable, allowUpdate) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
				expect(mapId).toBe("abc");
				expect(notSharable).toBeTruthy();
				expect(allowUpdate).toBeTruthy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it("survives already parsed JSON objects", function () {
			var map = {id: 1, title: "X"},
				underTest = new MM.FileSystemAdapter(fakeFS(map, 'application/json', true)),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, notSharable, allowUpdate) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
			});
			expect(wasCalled).toBeTruthy();
		});
		it("converts freemind format", function () {
			var map = {id: 1, title: "X"},
				xml = '<map version="0.7.1"><node ID="1" TEXT="X"></node></map>',
				underTest = new MM.FileSystemAdapter(fakeFS(xml, 'application/x-freemind', true)),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, notSharable, allowUpdate) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
			});
			expect(wasCalled).toBeTruthy();
		});
		it("propagates progress", function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemAdapter(fs),
				progCallback = jasmine.createSpy('progress');
			fs.loadMap = function () { return jQuery.Deferred().notify("ABC").promise(); };
			underTest.loadMap('abc').progress(progCallback);
			expect(progCallback).toHaveBeenCalledWith("ABC");
		});
		it("propagates errors", function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemAdapter(fs),
				errorCallback = jasmine.createSpy('error');
			fs.loadMap = function () { return jQuery.Deferred().reject("ABC").promise(); };
			underTest.loadMap('abc').fail(errorCallback);
			expect(errorCallback).toHaveBeenCalledWith("ABC");
		});
	});
});
