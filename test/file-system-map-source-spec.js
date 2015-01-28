/*global MM,describe, it, jQuery, expect, jasmine,  spyOn */
describe('MM.FileSystemMapSource', function () {
	'use strict';
	var fakeFS = function (content, contentType, fileName) {
		return {
			loadMap: function (mapId) {
				return jQuery.Deferred().resolve(content, mapId, contentType, {}, fileName).promise();
			},
			saveMap: function (content, mapId) {
				return jQuery.Deferred().resolve(mapId);
			},
			description: 'fake FS',
			recognises: function (mapid) {
				return mapid === 'fake';
			}
		};
	};
	describe('loadMap', function () {
		it('converts JSON content as non readonly', function () {
			var map = {id: 1, title: 'X'},
				underTest = new MM.FileSystemMapSource(fakeFS(JSON.stringify(map), 'application/json')),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, properties) {
				wasCalled = true;
				expect(content).toEqual(jasmine.objectContaining(map));
				expect(mapId).toBe('abc');
				expect(properties.editable).toBeTruthy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it('defaults to JSON on octet-stream', function () {
			var map = {id: 1, title: 'X'},
				underTest = new MM.FileSystemMapSource(fakeFS(JSON.stringify(map), 'application/octet-stream')),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, properties) {
				wasCalled = true;
				expect(content).toEqual(jasmine.objectContaining(map));
				expect(properties.editable).toBeTruthy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it('survives already parsed JSON objects', function () {
			var map = {id: 1, title: 'X'},
				underTest = new MM.FileSystemMapSource(fakeFS(map, 'application/json')),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, properties) {
				wasCalled = true;
				expect(content).toEqual(jasmine.objectContaining(map));
				expect(properties.editable).toBeTruthy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it('rejects incorrect JSON format without falling over', function () {
			var incorrectmap = '<xml>{id: 1, title: "X"}</xml>',
				underTest = new MM.FileSystemMapSource(fakeFS(incorrectmap, 'application/json')),
				spy = jasmine.createSpy();
			underTest.loadMap('abc').fail(spy);
			expect(spy).toHaveBeenCalledWith('format-error', 'File content not in correct format for this file type');
		});
		it('converts freemind format as readonly', function () {
			var map = {id: 1, title: 'X'},
				xml = '<map version="0.7.1"><node ID="1" TEXT="X"></node></map>',
				underTest = new MM.FileSystemMapSource(fakeFS(xml, 'application/x-freemind')),
				wasCalled = false;
			underTest.loadMap('abc').done(function (content, mapId, properties) {
				wasCalled = true;
				expect(content).toEqual(jasmine.objectContaining(map));
				expect(properties.editable).toBeFalsy();
			});
			expect(wasCalled).toBeTruthy();
		});
		it('propagates progress', function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				progCallback = jasmine.createSpy('progress');
			fs.loadMap = function () {
				return jQuery.Deferred().notify('ABC').promise();
			};
			underTest.loadMap('abc').progress(progCallback);
			expect(progCallback).toHaveBeenCalledWith('ABC');
		});
		it('propagates errors', function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				errorCallback = jasmine.createSpy('error');
			fs.loadMap = function () {
				return jQuery.Deferred().reject('ABC').promise();
			};
			underTest.loadMap('abc').fail(errorCallback);
			expect(errorCallback).toHaveBeenCalledWith('ABC');
		});
		it('fails if content type is not supported', function () {
			var underTest = new MM.FileSystemMapSource(fakeFS(undefined, 'application/x-unsupported')),
				errorCallback = jasmine.createSpy('error');
			underTest.loadMap('abc').fail(errorCallback);
			expect(errorCallback).toHaveBeenCalledWith('format-error', 'Unsupported format application/x-unsupported');
		});
		it('fails with map-load-redirect if content type is collaborative map', function () {
			var underTest = new MM.FileSystemMapSource(fakeFS(undefined, 'application/vnd.mindmup.collab')),
				errorCallback = jasmine.createSpy('error');
			underTest.loadMap('abc').fail(errorCallback);
			expect(errorCallback).toHaveBeenCalledWith('map-load-redirect', 'cabc');
		});
		describe('tries to guess mime type if not defined',
			[
				['guesses .mm files starting with <map as freemind',	'freemind.mm',	'<map version="0.7.1"><node ID="1" TEXT="X"></node></map>'],
				['guesses .mup as mindmup format',						'map.mup'],
				['ignores case when guessing, so .Mup is OK',			'map.Mup'],
				['uses only the last .XX when guessing',				'map.mm.mup'],
				['defaults to application/json when unknown extension',	'map.mindmap']
			],
			function (fileName, fileContent) {
				var map = {id: 1, title: 'X'},
					underTest = new MM.FileSystemMapSource(fakeFS(fileContent  || JSON.stringify(map), undefined, fileName)),
					wasCalled = false;
				underTest.loadMap('abc').done(function (content) {
					wasCalled = true;
					expect(content).toEqual(jasmine.objectContaining(map));
				});
				expect(wasCalled).toBeTruthy();
			});
	});
	describe('saveMap', function () {
		it('converts map to JSON string and extracts title before propagating', function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				map = {title: 'abc'},
				id = 'mapIdxxx';
			spyOn(fs, 'saveMap').and.callThrough();
			underTest.saveMap(map, id, true);
			expect(fs.saveMap).toHaveBeenCalledWith(JSON.stringify(map, '', 2), id, 'abc.mup', true);
		});
		it('propagates success', function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				successCallback = jasmine.createSpy('success');
			fs.saveMap = function () {
				return jQuery.Deferred().resolve('ABC').promise();
			};
			underTest.saveMap('abc').done(successCallback);
			expect(successCallback).toHaveBeenCalledWith('ABC');
		});
		it('propagates progress', function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				progCallback = jasmine.createSpy('progress');
			fs.saveMap = function () {
				return jQuery.Deferred().notify('ABC').promise();
			};
			underTest.saveMap('abc').progress(progCallback);
			expect(progCallback).toHaveBeenCalledWith('ABC');
		});
		it('propagates errors', function () {
			var fs = fakeFS(),
				underTest = new MM.FileSystemMapSource(fs),
				errorCallback = jasmine.createSpy('error');
			fs.saveMap = function () {
				return jQuery.Deferred().reject('ABC').promise();
			};
			underTest.saveMap('abc').fail(errorCallback);
			expect(errorCallback).toHaveBeenCalledWith('ABC');
		});
		it('uses the map title with .mup as the default title to pass to file systems', function () {
			var fs = fakeFS(),
				map = {title: 'abc'},
				underTest = new MM.FileSystemMapSource(fs);
			spyOn(fs, 'saveMap').and.callThrough();
			underTest.saveMap(map);
			expect(fs.saveMap.calls.mostRecent().args[2]).toBe('abc.mup');
		});
		it('replaces slashes, CR, LF, and tabs with spaces from the map the default map title to prevent problems with file systems', function () {
			var fs = fakeFS(),
				map = {title: 'ab/c\nde\rf\tg'},
				underTest = new MM.FileSystemMapSource(fs);
			spyOn(fs, 'saveMap').and.callThrough();
			underTest.saveMap(map);
			expect(fs.saveMap.calls.mostRecent().args[2]).toBe('ab c de f g.mup');
		});
	});
	it('delegates calls to recognises()', function () {
		var fs = fakeFS(),
			underTest = new MM.FileSystemMapSource(fs);
		expect(underTest.recognises('fake')).toBeTruthy();
		expect(underTest.recognises('xfake')).toBeFalsy();
	});
	it('delegates calls to description', function () {
		var fs = fakeFS(),
			underTest = new MM.FileSystemMapSource(fs);
		expect(underTest.description).toBe('fake FS');
	});
});
