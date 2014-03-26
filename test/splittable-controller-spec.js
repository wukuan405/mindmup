/*global describe, beforeEach, afterEach, jQuery, MM, it, expect, _, spyOn*/
describe('MM.SplittableController', function () {
	'use strict';
	var underTest,
		element,
		splitTypes = ['no-split', 'row-split', 'column-split'],
		template =	'<div></div>';
	beforeEach(function () {
		element = jQuery(template).appendTo('body');
		underTest = new MM.SplittableController(element);
	});
	afterEach(function () {
		element.remove();
	});
	describe('currentSplit', function () {
		it('should return no-split if element has no class', function () {
			expect(underTest.currentSplit()).toEqual('no-split');
		});
		it('should return no-split if element has other class', function () {
			element.addClass('foo');
			expect(underTest.currentSplit()).toEqual('no-split');
		});
		_.each(splitTypes, function (splitType) {
			it('should return ' + splitType + ' if element has ' + splitType + ' class', function () {
				element.addClass(splitType);
				expect(underTest.currentSplit()).toEqual(splitType);
			});
		});
	});
	describe('split', function () {
		_.each(splitTypes, function (splitType) {
			it('should return true and set element class for ' + splitType, function () {
				expect(underTest.split(splitType)).toBeTruthy();
				expect(element.hasClass(splitType)).toBeTruthy();
			});
		});
		it('should return false and not set unrecognised class', function () {
			expect(underTest.split('blah')).toBeFalsy();
			expect(element.hasClass('blah')).toBeFalsy();
		});
		it('should return false and not set undefined class', function () {
			expect(underTest.split()).toBeFalsy();
			expect(element.hasClass()).toBeFalsy();
		});
	});
	describe('toggle', function () {
		it('should toggle to row-split if height > width', function () {
			spyOn(element, 'innerHeight').and.returnValue(11);
			spyOn(element, 'innerWidth').and.returnValue(10);
			underTest.toggle();
			expect(element.hasClass('row-split')).toBeTruthy();
		});
		it('should toggle to column-split if height < width', function () {
			spyOn(element, 'innerHeight').and.returnValue(10);
			spyOn(element, 'innerWidth').and.returnValue(11);
			underTest.toggle();
			expect(element.hasClass('column-split')).toBeTruthy();
		});
		it('should toggle to column-split if height same as width', function () {
			spyOn(element, 'innerHeight').and.returnValue(10);
			spyOn(element, 'innerWidth').and.returnValue(10);
			underTest.toggle();
			expect(element.hasClass('column-split')).toBeTruthy();
		});
		it('should toggle to no-split if currently column-split', function () {
			element.addClass('column-split');
			underTest.toggle();
			expect(element.hasClass('no-split')).toBeTruthy();
		});
		it('should toggle to no-split if currently row-split', function () {
			element.addClass('row-split');
			underTest.toggle();
			expect(element.hasClass('no-split')).toBeTruthy();
		});
	});
	describe('flip', function () {
		it('should return false if currently no-split and not change split', function () {
			expect(underTest.flip()).toBeFalsy();
			expect(underTest.currentSplit()).toEqual('no-split');
		});
		it('should return true and change to column-split if row-split', function () {
			element.addClass('row-split');
			expect(underTest.flip()).toBeTruthy();
			expect(underTest.currentSplit()).toEqual('column-split');
		});
		it('should return true and change to row-split if column-split', function () {
			element.addClass('column-split');
			expect(underTest.flip()).toBeTruthy();
			expect(underTest.currentSplit()).toEqual('row-split');
		});
	});
});