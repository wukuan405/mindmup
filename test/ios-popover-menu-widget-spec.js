/* global describe, it, beforeEach, afterEach, expect, jQuery*/
describe('iosPopoverMenuWidget', function () {
	'use strict';
	var template =  '<div style="height:500px; width:500px; position:absolute;">' +
										'<div data-mm-role="popover-toolbar" style="height:100px; width:100px; position:absolute;">' +
										'</div>' +
										'<div data-mm-role="popover-pointer-top" style="height:20px; width:20px; position:absolute;"></div>' +
										'<div data-mm-role="popover-pointer-bottom" style="height:20px; width:20px; position:absolute;"></div>' +
										'<button data-mm-role="popover-close" ></button>' +
									'</div>',
			underTest;
	beforeEach(function () {
		underTest = jQuery(template).appendTo('body').iosPopoverMenuWidget().hide();
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('should hide the popover', function () {
		beforeEach(function () {
			underTest.trigger(new jQuery.Event('showPopover', {x: 250, y: 250, noDelay: true}));
		});
		it('when close button is clicked', function () {
			underTest.find('[data-mm-role=popover-close]').click();
			expect(underTest.is(':visible')).toBeFalsy();
		});
		it('when the hidePopover event is triggered', function () {
			underTest.trigger(new jQuery.Event('hidePopover'));
			expect(underTest.is(':visible')).toBeFalsy();
		});
		it('when the element is clicked', function () {
			underTest.click();
			expect(underTest.is(':visible')).toBeFalsy();
		});
	});
	describe('when popover is shown', function () {
		var toolbar, topPointer, bottomPointer;
		beforeEach(function () {
			toolbar = underTest.find('[data-mm-role=popover-toolbar]');
			topPointer = underTest.find('[data-mm-role=popover-pointer-top]');
			bottomPointer = underTest.find('[data-mm-role=popover-pointer-bottom]');
		});
		describe('near the top of the container', function () {
			beforeEach(function () {
				underTest.trigger(new jQuery.Event('showPopover', {x: 250, y: 10, noDelay: true}));
			});
			it('it should be made visible', function () {
				expect(underTest.is(':visible')).toBeTruthy();
			});
			it('positions the toolbar 10px below the click position', function () {
				expect(toolbar.css('top')).toBe('20px');
			});
			it('positions the toolbar horizontally centered on click', function () {
				expect(toolbar.css('left')).toBe('200px');
			});
			it('makes the top pointer visible', function () {
				expect(topPointer.is(':visible')).toBeTruthy();
			});
			it('hides the bottom pointer', function () {
				expect(bottomPointer.is(':visible')).toBeFalsy();
			});
		});
		describe('near the bottom of the container', function () {
			beforeEach(function () {
				underTest.trigger(new jQuery.Event('showPopover', {x: 250, y: 490, noDelay: true}));
			});
			it('it should be made visible', function () {
				expect(underTest.is(':visible')).toBeTruthy();
			});
			it('positions the toolbar 10px above the click position', function () {
				expect(toolbar.css('top')).toBe('380px');
			});
			it('positions the toolbar horizontally centered on click', function () {
				expect(toolbar.css('left')).toBe('200px');
			});
			it('makes the bottom pointer visible', function () {
				expect(bottomPointer.is(':visible')).toBeTruthy();
			});
			it('hides the top pointer', function () {
				expect(topPointer.is(':visible')).toBeFalsy();
			});
		});
		describe('near the left of the container', function () {
			beforeEach(function () {
				underTest.trigger(new jQuery.Event('showPopover', {x: 10, y: 250, noDelay: true}));
			});
			it('positions the toolbar near the left', function () {
				expect(toolbar.css('left')).toBe('10px');
			});
		});
		describe('near the right of the container', function () {
			beforeEach(function () {
				underTest.trigger(new jQuery.Event('showPopover', {x: 490, y: 250, noDelay: true}));
			});
			it('positions the toolbar near the right', function () {
				expect(toolbar.css('left')).toBe('390px');
			});
		});

	});
});
