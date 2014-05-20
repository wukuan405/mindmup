/*global describe, beforeEach, afterEach, jQuery, it, expect, jasmine, observable*/
describe('splittableWidget', function  () {
	'use strict';
	var underTest,
		splittableController,
		defaultPanel,
		optionalPanel,

		template =
		'<div id="splittableWidgetElement">' +
			'<div data-mm-role="default" ></div>' +
			'<div data-mm-role="optional" style="display:none;"></div>' +
		'</div>';
	beforeEach(function () {
		splittableController = observable({
			currentSplit: jasmine.createSpy('currentSplit').and.returnValue('column-split')
		});
		underTest = jQuery(template).appendTo('body').splittableWidget(splittableController, 20);
		defaultPanel = underTest.find('[data-mm-role=default]');
		optionalPanel = underTest.find('[data-mm-role=optional]');
	});
	afterEach(function () {
		underTest.remove();
	});
	it('should return the dom element', function () {
		expect(underTest.attr('id')).toEqual('splittableWidgetElement');
	});
	it('should set the split to the current split (column-split) when first initialised', function () {
		expect(optionalPanel.attr('style')).toContain('top: 20px;');
		expect(optionalPanel.attr('style')).toContain('display: block;');
		expect(defaultPanel.attr('style').trim()).toEqual('top: 20px;');
	});
	it('should change to row-split', function () {
		splittableController.dispatchEvent('split', 'row-split');
		expect(optionalPanel.attr('style')).toContain('top: 50%;');
		expect(optionalPanel.attr('style')).toContain('display: block;');
		expect(defaultPanel.attr('style').trim()).toEqual('top: 0px;');
	});
	it('should change to no-split', function () {
		splittableController.dispatchEvent('split', 'no-split');
		expect(optionalPanel.attr('style')).toContain('top: 0px;');
		expect(optionalPanel.attr('style')).toContain('display: none;');
		expect(defaultPanel.attr('style').trim()).toEqual('top: 0px;');
	});
});
