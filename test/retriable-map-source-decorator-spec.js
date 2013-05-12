/*global MM, MAPJS, describe, it, beforeEach, afterEach, jQuery, expect, jasmine, observable, _, spyOn, sinon */
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
