/*global jasmine, beforeEach*/
beforeEach(function () {
	'use strict';
	jasmine.addMatchers({
		toHaveTagName: function (util, customEqualityTesters) {
			return {
				compare: function (actual, expected) {
					var result = {},
						tag = actual && actual.prop('tagName'),
						expectedTag = expected && expected.toLowerCase();
					tag = tag && tag.toLowerCase();
					result.pass = util.equals(tag, expectedTag.toLowerCase(), customEqualityTesters);
					if (!result.pass) {
						result.message = 'Expected  ' + tag + ' to match  ' + expectedTag;
					}
					return result;
				}
			};
		}
	});
});

