/* global describe, it, beforeEach, afterEach, expect, jQuery, observable, jasmine*/
describe('iosLinkEditWidget', function () {
	'use strict';
	var template =  '<div>' +
										'<button data-mm-role="link-removal"></button>' +
										'<button data-mm-role="link-color"></button>' +
										'<button data-mm-role="link-arrow"></button>' +
										'<button data-mm-role="link-no-arrow"></button>' +
										'<button data-mm-role="link-solid"></button>' +
										'<button data-mm-role="link-dashed"></button>' +
									'</div>',
			underTest,
			mapModel,
			link,
			selectionPoint,
			linkStyle;

	beforeEach(function () {
		link = {ideaIdFrom: 101, ideaIdTo: 202};
		linkStyle = {arrow: false, lineStyle: 'solid'};
		selectionPoint = {x: 10, y: 20};
		mapModel = observable({});
		underTest = jQuery(template).appendTo('body').iosLinkEditWidget(mapModel);
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('when map model dispatches a linkSelected event', function () {
		it('should trigger a showPopover event', function () {
			var spy = jasmine.createSpy('showPopover');
			underTest.on('showPopover', spy);
			mapModel.dispatchEvent('linkSelected', link, selectionPoint, linkStyle);
			expect(spy).toHaveBeenCalled();
			expect(spy.calls.mostRecent().args[0].x).toBe(selectionPoint.x);
			expect(spy.calls.mostRecent().args[0].y).toBe(selectionPoint.y);
		});
		it('should set model args for link removal', function () {
			mapModel.dispatchEvent('linkSelected', link, selectionPoint, linkStyle);
			expect(underTest.find('[data-mm-role=link-removal]').data('mm-model-args')).toEqual([101, 202]);
		});
		it('should set model args for link color', function () {
			mapModel.dispatchEvent('linkSelected', link, selectionPoint, linkStyle);
			expect(underTest.find('[data-mm-role=link-color]').data('mm-model-args')).toEqual([101, 202, 'color']);
		});
		describe('for line with no arrow', function () {
			beforeEach(function () {
				mapModel.dispatchEvent('linkSelected', link, selectionPoint, linkStyle);
			});
			it('should set model args for add arrow control', function () {
				expect(underTest.find('[data-mm-role=link-arrow]').data('mm-model-args')).toEqual([101, 202, 'arrow', true]);
			});
			it('should show the add arrow control', function () {
				expect(underTest.find('[data-mm-role=link-arrow]').is(':visible')).toBeTruthy();
			});
			it('should hide the no arrow control', function () {
				expect(underTest.find('[data-mm-role=link-no-arrow]').is(':visible')).toBeFalsy();
			});
		});
		describe('for line with an arrow', function () {
			beforeEach(function () {
				linkStyle.arrow = true;
				mapModel.dispatchEvent('linkSelected', link, selectionPoint, linkStyle);
			});
			it('should set model args for no arrow control', function () {
				expect(underTest.find('[data-mm-role=link-no-arrow]').data('mm-model-args')).toEqual([101, 202, 'arrow', false]);
			});
			it('should hide the add arrow control', function () {
				expect(underTest.find('[data-mm-role=link-arrow]').is(':visible')).toBeFalsy();
			});
			it('should show the no arrow control', function () {
				expect(underTest.find('[data-mm-role=link-no-arrow]').is(':visible')).toBeTruthy();
			});
		});
		describe('for a solid line', function () {
			beforeEach(function () {
				mapModel.dispatchEvent('linkSelected', link, selectionPoint, linkStyle);
			});
			it('should set model args for dashed line control', function () {
				expect(underTest.find('[data-mm-role=link-dashed]').data('mm-model-args')).toEqual([101, 202, 'lineStyle', 'dashed']);
			});
			it('should hide the add solid line control', function () {
				expect(underTest.find('[data-mm-role=link-solid]').is(':visible')).toBeFalsy();
			});
			it('should show the dashed line control', function () {
				expect(underTest.find('[data-mm-role=link-dashed]').is(':visible')).toBeTruthy();
			});
		});
		describe('for a dashed line', function () {
			beforeEach(function () {
				linkStyle.lineStyle = 'dashed';
				mapModel.dispatchEvent('linkSelected', link, selectionPoint, linkStyle);
			});
			it('should set model args for solid line control', function () {
				expect(underTest.find('[data-mm-role=link-solid]').data('mm-model-args')).toEqual([101, 202, 'lineStyle', 'solid']);
			});
			it('should show the add solid line control', function () {
				expect(underTest.find('[data-mm-role=link-solid]').is(':visible')).toBeTruthy();
			});
			it('should hide the dashed line control', function () {
				expect(underTest.find('[data-mm-role=link-dashed]').is(':visible')).toBeFalsy();
			});
		});

	});
});
