/*global MM, MAPJS, describe, it, beforeEach, afterEach, jQuery, expect, jasmine, observable, _, spyOn, sinon */
describe('MM.RetriableMapSourceDecorator', function () {
	'use strict';
	var underTest, decorated, clock;
	beforeEach(function () {
		var adapterPrototype = observable({
			loadMap: function (mapId) {
				return jQuery.Deferred().resolve(MAPJS.content({ 'title': 'hello' }), mapId).promise();
			},
			saveMap: function (contentToSave, oldId) {
				return jQuery.Deferred().resolve(oldId).promise();
			},
			recognises: function (mapId) {
				return 'fake' === mapId;
			},
			description: 'fake adapter'
		});
		decorated = _.clone(adapterPrototype);
		underTest = new MM.RetriableMapSourceDecorator(decorated);
		clock = sinon.useFakeTimers();
	});
	afterEach(function () {
		clock.restore();
	});

	describe('loadMap', function () {

		it('should use retry', function () {
			spyOn(MM, 'retry').and.callThrough();

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
	describe('saveMap', function () {
		it('should use retry', function () {
			spyOn(MM, 'retry').and.callThrough();

			underTest.saveMap();

			expect(MM.retry).toHaveBeenCalled();
		});
		it('should not retry if not network-error but propagate error reason', function () {
			var callCount = 0, failed = jasmine.createSpy();
			decorated.saveMap = function () {
				callCount++;
				return jQuery.Deferred().reject('errorMsg', 'foo').promise();
			};

			underTest.saveMap().fail(failed);
			expect(failed).toHaveBeenCalledWith('errorMsg', 'foo');

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
	it('delegates calls to recognises()', function () {
		expect(underTest.recognises('fake')).toBeTruthy();
		expect(underTest.recognises('xfake')).toBeFalsy();
	});
	it('delegates calls to description', function () {
		expect(underTest.description).toBe('fake adapter');
	});
});
describe('MM.retry', function () {
	'use strict';
	var buildTaskToFailTimes = function (failTimes) {
		var retryCount = 0;
		return function () {
			var deferred = jQuery.Deferred();
			if (failTimes) {
				failTimes--;
				retryCount++;
				deferred.reject(retryCount);
			} else {
				deferred.resolve(retryCount);
			}
			return deferred.promise();
		};
	};
	it('should retry until task succeeds then resolve', function () {
		var retryCount = 0,
			rejected = jasmine.createSpy();

		MM.retry(buildTaskToFailTimes(4), MM.retryTimes(4)).then(function (r) {
			retryCount = r;
		}, rejected);

		expect(retryCount).toBe(4);
		expect(rejected).not.toHaveBeenCalled();
	});
	it('should reject once the task retries exceeded', function () {
		var rejected = jasmine.createSpy();

		MM.retry(buildTaskToFailTimes(5), MM.retryTimes(4)).fail(rejected);

		expect(rejected).toHaveBeenCalled();
	});
	it('should setTimeout if backoff supplied', function () {
		var retryCount = 0,
			clock = sinon.useFakeTimers();
		MM.retry(
			buildTaskToFailTimes(1),
			MM.retryTimes(1),
			function () {
				return 1000;
			}
		).then(function (r) {
			retryCount = r;
		});

		clock.tick(999);
		expect(retryCount).toBe(0);
		clock.tick(2);
		expect(retryCount).toBe(1);
		clock.restore();
	});
});
describe('MM.linearBackoff', function () {
	'use strict';
	it('should return increasing number of seconds with each call', function () {
		var underTest = MM.linearBackoff();

		expect(underTest()).toBe(1000);
		expect(underTest()).toBe(2000);
	});
});
