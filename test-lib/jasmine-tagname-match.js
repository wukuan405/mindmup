/*global jasmine, beforeEach,  describe, it , expect, jQuery, afterEach*/
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
describe('toHaveTagName', function () {
	'use strict';
	var container;
	beforeEach(function () {
		container = jQuery('<span>').appendTo('body');
	});
	afterEach(function () {
		container.remove();
	});
	it('should compare objects using their tag name', function () {
		jQuery('<a id="elem1" href="a"/>').appendTo(container);
		jQuery('<a id="elem2" href="b"/>').appendTo(container);
		jQuery('<span id="elem3" data-mm-role="a"/>').appendTo(container);
		expect(jQuery('#elem1')).toHaveTagName('a');
		expect(jQuery('#elem2')).toHaveTagName('a');
		expect(jQuery('#elem3')).not.toHaveTagName('a');
		expect(jQuery('#elem4')).not.toHaveTagName('a');
	});
});

