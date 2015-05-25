/* global describe, it, beforeEach, afterEach, expect, jQuery, jasmine*/
describe('iosBackgroundColorWidget', function () {
	'use strict';
	var template = '<div>' +
									'<img data-mm-role="transparent-color-image" src="http://www.foo.com/icon_transparent_color.svg"/>' +
									'<span data-mm-role="ios-color-selector-template" style="display:none;"></span>' +
									'<div data-mm-role="ios-color-palette"></div>' +
									'</div>',
			mapModel,
			underTest,
			palette;
	beforeEach(function () {
		mapModel = jasmine.createSpyObj('mapModel', ['updateStyle', 'anotherMethod']);
		underTest = jQuery(template).appendTo('body').iosBackgroundColorWidget(mapModel, ['000000', 'FFFFFF', 'transparent'], 'ios-test');
		palette = underTest.find('[data-mm-role="ios-color-palette"]');
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('creates color selectors', function () {
		var selectors;
		beforeEach(function () {
			selectors = palette.find('[data-mm-role="ios-color-selector-template"]');
		});
		it('should add a color selector for each configured color in the palette element', function () {
			expect(selectors.size()).toBe(3);
		});
		it('should set the background color when it is a hex', function () {
			expect(jQuery(selectors[0]).css('background-color')).toBe('rgb(0, 0, 0)');
			expect(jQuery(selectors[1]).css('background-color')).toBe('rgb(255, 255, 255)');
		});
		it('should set the background image when it is transparent', function () {
			expect(jQuery(selectors[2]).css('background-image')).toBe('url(http://www.foo.com/icon_transparent_color.svg)');
		});
		describe('clicking on the selector', function () {
			it('sets the background color when it is a hex color', function () {
				jQuery(selectors[0]).click();
				expect(mapModel.updateStyle).toHaveBeenCalledWith('ios-test', 'background', '#000000');
			});
			it('clears the background color when it is a transparent', function () {
				jQuery(selectors[2]).click();
				expect(mapModel.updateStyle).toHaveBeenCalledWith('ios-test', 'background', '');
			});
			describe('when a different mapModel method is configured', function () {
				beforeEach(function () {
					underTest.remove();
					underTest = jQuery(template).appendTo('body');
					underTest.data('mm-model-method', 'anotherMethod');
					underTest.iosBackgroundColorWidget(mapModel, ['000000', 'FFFFFF', 'transparent'], 'ios-test');
					palette = underTest.find('[data-mm-role="ios-color-palette"]');
					selectors = palette.find('[data-mm-role="ios-color-selector-template"]');
				});
				it('uses the configured mapModel method', function () {
					jQuery(selectors[0]).click();
					expect(mapModel.anotherMethod).toHaveBeenCalledWith('ios-test', 'background', '#000000');
				});
				it('passes additional arguments if specified', function () {
					underTest.data('mm-model-args', ['a', 1]);
					jQuery(selectors[0]).click();
					expect(mapModel.anotherMethod).toHaveBeenCalledWith('ios-test', 'a', 1, '#000000');
				});
			});
			it('hides the widget', function () {
				jQuery(selectors[1]).click();
				expect(underTest.is(':visible')).toBeFalsy();
			});
		});
	});

});
