/*global beforeEach, afterEach, waitsFor, describe, expect, it, $, MM, spyOn, runs, _*/

describe('MM.DeferredStub', function () {
	'use strict';
	var underTest,
		target,
		listener = function () {
			var types = arguments;
			return function (msg) {
				var result = msg.data.content;
				if (!_.isArray(result)) {
					result = [result];
				}
				_.each(types, function (type) {
					msg.source.postMessage({id: msg.data.id, type: type, content: result}, '*');
				});
			};
		};
	beforeEach(function () {
		underTest = new MM.DeferredStub('#DeferredStubSpecTarget');
		target = $('<iframe id="DeferredStubSpecTarget">').appendTo('body')[0];
		spyOn(target.contentWindow, 'postMessage').andCallThrough();
	});
	afterEach(function () {
		$(target).remove();
		underTest.targetUnloaded();
	});
	describe('before the target is loaded', function () {
		it('should not apply calls to target', function () {
			underTest.postMessage('msg1');
			expect(target.contentWindow.postMessage).not.toHaveBeenCalled();
		});
		it('should apply all previous calls to target when it is loaded', function () {
			underTest.postMessage('msg1');
			underTest.postMessage('msg2');
			underTest.targetLoaded();
			expect(target.contentWindow.postMessage).toHaveBeenCalledWith({id: 1, content: 'msg1'}, '*');
			expect(target.contentWindow.postMessage).toHaveBeenCalledWith({id: 2, content: 'msg2'}, '*');
		});
		it('should not apply all previous calls more than once', function () {
			underTest.postMessage('msg1');
			underTest.targetLoaded();
			underTest.targetLoaded();
			expect(target.contentWindow.postMessage.calls.length).toBe(1);
		});
	});
	describe('after target loaded', function () {
		beforeEach(function () {
			underTest.targetLoaded();
		});
		it('should apply immediately', function () {
			underTest.postMessage('msg1');
			expect(target.contentWindow.postMessage).toHaveBeenCalledWith({id: 1, content: 'msg1'}, '*');
		});
		describe('sets up a deferred promise for replies', function () {
			it('resolves the promise on success', function () {
				var result;
				target.contentWindow.addEventListener('message', listener('resolve'));
				underTest.postMessage('echo msg1').done(function (resultFromPromise) {
					result = resultFromPromise;
				});
				waitsFor(function () { return result; });
				runs(function () {
					expect(result).toBe('echo msg1');
				});
			});
			it('fails the promise on failure', function () {
				var result;
				target.contentWindow.addEventListener('message', listener('reject'));
				underTest.postMessage('echo msg1').fail(function (resultFromPromise) {
					result = resultFromPromise;
				});
				waitsFor(function () { return result; });
				runs(function () {
					expect(result).toBe('echo msg1');
				});

			});
			it('handle multiple arguments', function () {
				var result1, result2;
				target.contentWindow.addEventListener('message', listener('resolve'));
				underTest.postMessage(['foo', 'bar']).done(function (arg1, arg2) {
					result1 = arg1;
					result2 = arg2;
				});
				waitsFor(function () { return result1 && result2; });
				runs(function () {
					expect(result1).toBe('foo');
					expect(result2).toBe('bar');
				});
			});
			it('handle multiple messages', function () {
				var result1, result2;
				target.contentWindow.addEventListener('message', listener('resolve'));
				underTest.postMessage('bar').done(function (arg1) {
					console.log('xxx bar');
					result2 = arg1;
				});
				underTest.postMessage('foo').done(function (arg1) {
					console.log('xxx foo');
					result1 = arg1;
				});
				waitsFor(function () { return result1 && result2; });
				runs(function () {
					expect(result1).toBe('foo');
					expect(result2).toBe('bar');
				});
			});
			it('should clean up resolved promises', function () {
				var result;
				target.contentWindow.addEventListener('message', listener('resolve'));
				underTest.postMessage('echo msg1').done(function (resultFromPromise) {
					result = resultFromPromise;
				});
				waitsFor(function () { return result; });
				runs(function () {
					expect(underTest.pendingPromises()).toBe(0);
				});
			});
			it('should not clean up pending promises', function () {
				var result;
				target.contentWindow.addEventListener('message', listener('notify'));
				underTest.postMessage('echo msg1').progress(function (resultFromPromise) {
					result = resultFromPromise;
				});
				waitsFor(function () { return result; });
				runs(function () {
					expect(underTest.pendingPromises()).toBe(1);
				});
			});
		});
	});
});
describe('MM.deferredStubProxy', function () {
	'use strict';
	var stub, toExtend;
	beforeEach(function () {
		stub = {postMessage: function () {}};
		toExtend = {x: function () {return 'hello'; }};
	});
	it('should return extended object and use deferredStub.postMessage to send messages', function () {
		spyOn(stub, 'postMessage');
		MM.deferredStubProxy(toExtend, 'a name', stub, ['y']).y('foo', 'bar');
		expect(stub.postMessage).toHaveBeenCalledWith({name: 'a name', method: 'y', args: ['foo', 'bar']});
	});
	it('should leave other methods unchanged', function () {
		spyOn(stub, 'postMessage');
		var result = MM.deferredStubProxy(toExtend, 'a name', stub, ['y']).x('foo', 'bar');
		expect(result).toBe('hello');
		expect(stub.postMessage).not.toHaveBeenCalled();

	});
});
