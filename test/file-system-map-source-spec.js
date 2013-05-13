/*global MM, MAPJS, describe, it, beforeEach, afterEach, jQuery, expect, jasmine, observable, _, spyOn, sinon */
describe("MM.FileSystemMapSource", function () {
	'use strict';
	var fakeFS = function (content, contentType) {
		return {
			loadMap: function (mapId) {
				return jQuery.Deferred().resolve(content, mapId, contentType).promise();
			},
			saveMap: function (content, mapId, fileName) {
				return jQuery.Deferred().resolve(mapId);
			},
			notSharable: true,
			description: 'fake FS',
			recognises: function (mapid) {
				return mapid === 'fake';
			}
		};
	};
	describe("loadMap", function () {
		it("converts JSON content as non readonly", function () {
			var map = {id: 1, title: "X"},
				underTest = new MM.FileSystemMapSource(fakeFS(JSON.stringify(map), 'application/json')),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, readOnly) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
				expect(mapId).toBe("abc");
				expect(readOnly).toBeFalsy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it("defaults to JSON on octet-stream", function () {
			var map = {id: 1, title: "X"},
				underTest = new MM.FileSystemMapSource(fakeFS(JSON.stringify(map), 'application/octet-stream')),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, readOnly) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
				expect(readOnly).toBeFalsy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it("survives already parsed JSON objects", function () {
			var map = {id: 1, title: "X"},
				underTest = new MM.FileSystemMapSource(fakeFS(map, 'application/json')),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, readOnly) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
				expect(readOnly).toBeFalsy();
			});
			expect(wasCalled).toBeTruthy();
		});

		it("converts freemind format as readonly", function () {
			var map = {id: 1, title: "X"},
				xml = '<map version="0.7.1"><node ID="1" TEXT="X"></node></map>',
				underTest = new MM.FileSystemMapSource(fakeFS(xml, 'application/x-freemind')),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, readOnly) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
				expect(readOnly).toBeTruthy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it("propagates progress", function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				progCallback = jasmine.createSpy('progress');
			fs.loadMap = function () { return jQuery.Deferred().notify("ABC").promise(); };
			underTest.loadMap('abc').progress(progCallback);
			expect(progCallback).toHaveBeenCalledWith("ABC");
		});
		it("propagates errors", function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				errorCallback = jasmine.createSpy('error');
			fs.loadMap = function () { return jQuery.Deferred().reject("ABC").promise(); };
			underTest.loadMap('abc').fail(errorCallback);
			expect(errorCallback).toHaveBeenCalledWith("ABC");
		});
		it("fails if content type is not supported", function () {
			var map = {id: 1, title: "X"},
				underTest = new MM.FileSystemMapSource(fakeFS(map, 'application/x-unsupported')),
				wasCalled = false,
				errorCallback = jasmine.createSpy('error');
			underTest.loadMap('abc').fail(errorCallback);
			expect(errorCallback).toHaveBeenCalledWith('format-error', 'Unsupported format application/x-unsupported');
		});
	});
	describe("saveMap", function () {
		it("converts map to JSON string and extracts title before propagating", function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				map = {title: 'abc'},
				id = 'mapIdxxx';
			spyOn(fs, 'saveMap').andCallThrough();
			underTest.saveMap(map, id, true);
			expect(fs.saveMap).toHaveBeenCalledWith(JSON.stringify(map), id, 'abc.mup', true);
		});
		it("propagates success", function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				successCallback = jasmine.createSpy('success');
			fs.saveMap = function () { return jQuery.Deferred().resolve("ABC").promise(); };
			underTest.saveMap('abc').done(successCallback);
			expect(successCallback).toHaveBeenCalledWith("ABC");
		});
		it("propagates progress", function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				progCallback = jasmine.createSpy('progress');
			fs.saveMap = function () { return jQuery.Deferred().notify("ABC").promise(); };
			underTest.saveMap('abc').progress(progCallback);
			expect(progCallback).toHaveBeenCalledWith("ABC");
		});
		it("propagates errors", function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				errorCallback = jasmine.createSpy('error');
			fs.saveMap = function () { return jQuery.Deferred().reject("ABC").promise(); };
			underTest.saveMap('abc').fail(errorCallback);
			expect(errorCallback).toHaveBeenCalledWith("ABC");
		});
	});
	it("delegates calls to recognises()", function () {
		var fs = fakeFS(),
			underTest = new MM.FileSystemMapSource(fs);
		expect(underTest.recognises('fake')).toBeTruthy();
		expect(underTest.recognises('xfake')).toBeFalsy();
	});
	it("delegates calls to description", function () {
		var fs = fakeFS(),
			underTest = new MM.FileSystemMapSource(fs);
		expect(underTest.description).toBe('fake FS');
	});
	it("delegates calls to notSharable", function () {
		var fs = fakeFS(),
			underTest = new MM.FileSystemMapSource(fs);
		expect(underTest.notSharable).toBe(true);
	});
});
