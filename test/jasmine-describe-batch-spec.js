/*global describe, expect*/
describe('jasmine custom batch describe', function () {
	'use strict';
	describe('cases as object properties', {
		'first': [1, 2],
		'second': [2, 4]
	}, function (num, twice) {
		expect(twice).toEqual(num * 2);
	});
});
