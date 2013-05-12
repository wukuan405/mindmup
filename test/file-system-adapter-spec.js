/*global MM, MAPJS, describe, it, beforeEach, afterEach, jQuery, expect, jasmine, observable, _, spyOn, sinon */
describe("MM.FileSystemMapSource", function () {
	'use strict';
	var fakeFS = function (content, contentType, allowUpdate) {
		return {
			loadMap: function (mapId) {
				return jQuery.Deferred().resolve(content, mapId, contentType, allowUpdate).promise();
			},
			notSharable: true,
			description: 'fake FS',
			recognises: function (mapid) {
				return mapid === 'fake';
			}
		};
	};
	describe("loadMap", function () {
		it("delegates to fileSystem and converts content before resolving", function () {
			var map = {id: 1, title: "X"},
				underTest = new MM.FileSystemMapSource(fakeFS(JSON.stringify(map), 'application/json', true)),
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
				underTest = new MM.FileSystemMapSource(fakeFS(JSON.stringify(map), 'application/json', true)),
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
				underTest = new MM.FileSystemMapSource(fakeFS(map, 'application/json', true)),
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
				underTest = new MM.FileSystemMapSource(fakeFS(xml, 'application/x-freemind', true)),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, notSharable, allowUpdate) {
				wasCalled = true;
				expect(content).toPartiallyMatch(map);
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
});
describe("MM.RetriableMapSourceDecorator", function () {
	'use strict';
	var underTest, decorated, clock;
	beforeEach(function () {
		var adapterPrototype = observable({
			loadMap: function (mapId) {
				return jQuery.Deferred().resolve(MAPJS.content({ "title": "hello" }), mapId).promise();
			},
			saveMap: function (contentToSave, oldId) {
				return jQuery.Deferred().resolve(oldId).promise();
			},
			recognises: function (mapId) {
				return "fake" === mapId;
			},
			description: 'fake adapter'
		});
		decorated = _.clone(adapterPrototype);
		underTest = new MM.RetriableMapSourceDecorator(decorated);
		clock = sinon.useFakeTimers();
	});

	describe("loadMap", function () {

		it('should use retry', function () {
			spyOn(MM, 'retry').andCallThrough();

			underTest.loadMap('foo');

			expect(MM.retry).toHaveBeenCalled();
		});
		it('should not retry if not network-error ', function () {
			var callCount = 0;
			decorated.loadMap = function () {
				callCount++;
				return jQuery.Deferred().reject('errorMsg').promise();
			};

			underTest.loadMap('foo');

			expect(callCount).toBe(1);
		});
		it('should call and then retry 5 times if it is a network-error ', function () {
			var callCount = 0;
			decorated.loadMap = function () {
				callCount++;
				return jQuery.Deferred().reject('network-error').promise();
			};
			underTest.loadMap('foo');
			clock.tick(120001);
			expect(callCount).toBe(6);
		});
	});
	describe("saveMap", function () {
		it('should use retry', function () {
			spyOn(MM, 'retry').andCallThrough();

			underTest.saveMap();

			expect(MM.retry).toHaveBeenCalled();
		});
		it('should not retry if not network-error ', function () {
			var callCount = 0;
			decorated.saveMap = function () {
				callCount++;
				return jQuery.Deferred().reject('errorMsg').promise();
			};

			underTest.saveMap();

			expect(callCount).toBe(1);
		});
		it('should call and then retry 5 times if it is a network-error ', function () {
			var callCount = 0;
			decorated.saveMap = function () {
				callCount++;
				return jQuery.Deferred().reject('network-error').promise();
			};

			underTest.saveMap();
			clock.tick(120001);

			expect(callCount).toBe(6);
		});
	});
	it("delegates calls to recognises()", function () {
		expect(underTest.recognises('fake')).toBeTruthy();
		expect(underTest.recognises('xfake')).toBeFalsy();
	});
	it("delegates calls to description", function () {
		expect(underTest.description).toBe('fake adapter');
	});
});
