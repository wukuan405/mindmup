/*global beforeEach, describe, expect, it, jQuery, MM, spyOn, runs, fail*/

describe('googleDrivePlaceholder', function () {
	'use strict';
	var underTest,
		proxy,
		deferredStub = function () {
			return jQuery.Deferred().resolve(arguments).promise();
		};
	beforeEach(function () {
		underTest = new MM.googleDrivePlaceholder();
		proxy = {};
	});
	it('should store save call and apply later', function () {
		var resolved;
		proxy.save = deferredStub;
		spyOn(proxy, 'save').andCallThrough();
		runs(function () {
			underTest.save('mapId', {title: 'a map'}).then(
				function () {
					resolved = true;
				},
				function () {
					fail('rejection is not expected');
				});
			underTest.applyTo(proxy);
		});
		runs(function () {
			expect(proxy.save.mostRecentCall.args[0]).toEqual('mapId');
			expect(proxy.save.mostRecentCall.args[1]).toEqual({title: 'a map'});
			expect(resolved).toBeTruthy();
		});
	});
	it('should store load call and apply later', function () {
		var resolved;
		proxy.load = deferredStub;
		spyOn(proxy, 'load').andCallThrough();
		runs(function () {
			underTest.load('mapId').then(
				function () {
					resolved = true;
				},
				function () {
					fail('rejection is not expected');
				});
			underTest.applyTo(proxy);
		});
		runs(function () {
			expect(proxy.load.mostRecentCall.args[0]).toEqual('mapId');
			expect(resolved).toBeTruthy();
		});
	});
	it('should store list call and apply later', function () {
		var resolved;
		proxy.list = deferredStub;
		spyOn(proxy, 'list').andCallThrough();
		runs(function () {
			underTest.list('foo=bar').then(
				function () {
					resolved = true;
				},
				function () {
					fail('rejection is not expected');
				});
			underTest.applyTo(proxy);
		});
		runs(function () {
			expect(proxy.list.mostRecentCall.args[0]).toEqual('foo=bar');
			expect(resolved).toBeTruthy();
		});
	});
});