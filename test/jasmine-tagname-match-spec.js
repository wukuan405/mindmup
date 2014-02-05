/*global beforeEach,  describe, it , expect, jQuery, afterEach*/
describe('jasmine custom matcher toHaveTagName', function () {
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
