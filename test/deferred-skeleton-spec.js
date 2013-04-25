/*global $, beforeEach, afterEach, describe, expect, it, MM, spyOn, waitsFor, runs, jQuery */
describe('MM.DeferredSkeleton', function () {
	'use strict';
	var objectToReceive,
		underTest,
		target,
		checkPostBack = function (type, expectedResult, name, method) {
			var result;
			name = name || 'a name';
			method = method || 'y';
			window.addEventListener('message', function (message) {result = message; });
			target.contentWindow.postMessage({id: 7, content: {name: name, method: method, args: ['foo', 'bar']}}, '*');
			waitsFor(function () {return result; });
			runs(function () {
				expect(result.data.id).toBe(7);
				expect(result.data.type).toBe(type);
				expect(result.data.content).toEqual(expectedResult);
			});
		};
	beforeEach(function () {
		objectToReceive = {
			y: function () {}
		};
		target = $('<iframe id="DeferredStubSpecTarget">').appendTo('body')[0];
		underTest = new MM.DeferredSkeleton({'a name': objectToReceive}, target.contentWindow);
	});
	afterEach(function () {
		underTest.targetUnloaded();
		$(target).remove();
	});
	it('should pass arguments from received message to correct object and method', function () {
		spyOn(objectToReceive, 'y');
		target.contentWindow.postMessage({id: 1, content: {name: 'a name', method: 'y', args: ['foo', 'bar']}}, '*');
		waitsFor(function () {return objectToReceive.y.calls.length > 0; });
		runs(function () {
			expect(objectToReceive.y).toHaveBeenCalledWith('foo', 'bar');
		});
	});
	it('should pass back deferred promise calls matching message id when resolved', function () {
		spyOn(objectToReceive, 'y').andReturn(jQuery.Deferred().resolve('foo', 'bar').promise());
		checkPostBack('resolve', ['foo', 'bar']);
	});
	it('should pass back result as resolved imediately if not a promise call', function () {
		spyOn(objectToReceive, 'y').andReturn('done');
		checkPostBack('resolve', ['done']);
	});
	it('should pass back result with empty args if not a promise call and returns undefined', function () {
		spyOn(objectToReceive, 'y');
		checkPostBack('resolve', []);
	});
	it('should pass back deferred promise calls matching message id when rejected', function () {
		spyOn(objectToReceive, 'y').andReturn(jQuery.Deferred().reject('foo', 'bar').promise());
		checkPostBack('reject', ['foo', 'bar']);
	});
	it('should pass back deferred promise calls matching message id when progress reported', function () {
		spyOn(objectToReceive, 'y').andReturn(jQuery.Deferred().notify('working').promise());
		checkPostBack('notify', ['working']);
	});
	it('should fail when the object name does not map to any known object', function () {
		checkPostBack('reject', ['No Object Found'], 'different name');
	});
	it('should fail when the object name matches but method does not exist ', function () {
		checkPostBack('reject', ['No Method Found'], 'a name', 'no method');
	});
	it('should fail when there is an exception during execution', function () {
		spyOn(objectToReceive, 'y').andThrow('hello!');
		checkPostBack('reject', [JSON.stringify('hello!')]);
	});
});