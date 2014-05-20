/*global describe, beforeEach, afterEach, jQuery, MM, it, expect, _, spyOn, jasmine, document*/
describe('MM.SplittableController', function () {
	'use strict';
	var underTest,
		element,
		mapModel,
		splitTypes = ['no-split', 'row-split', 'column-split'],
		template =	'<div><span data-mm-role="optional-content" id="test1"></span><span data-mm-role="optional-content" id="test2"></span></div>';
	beforeEach(function () {
		element = jQuery(template).appendTo('body');
		mapModel = jasmine.createSpyObj('mapModel', ['getCurrentlySelectedIdeaId', 'centerOnNode']);
		mapModel.getCurrentlySelectedIdeaId.and.returnValue(22);
		//element, mapModel, storage, storageKey, defaultContent
		underTest = new MM.SplittableController(element, mapModel, {'test-split': 'test1'}, 'test-split', 'test1');
	});
	afterEach(function () {
		element.remove();
	});
	it('should set the visibility of the optional content from storage', function () {
		expect(jQuery('#test1').css('display')).not.toBe('none');
		expect(jQuery('#test2').css('display')).toBe('none');
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
			it('should dispatch a split event for ' + splitType, function () {
				var listener = jasmine.createSpy('listener');
				underTest.addEventListener('split', listener);
				underTest.split(splitType);
				expect(listener).toHaveBeenCalledWith(splitType);
			});
			it('should center map on currently selected node for ' + splitType, function () {
				underTest.split(splitType);
				expect(mapModel.centerOnNode).toHaveBeenCalledWith(22);
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
		var toggleId;
		beforeEach(function () {
			toggleId = 'test1';
		});
		describe('when toggleId does not change', function () {
			it('should toggle to row-split if height > width', function () {
				spyOn(element, 'innerHeight').and.returnValue(11);
				spyOn(element, 'innerWidth').and.returnValue(10);
				underTest.toggle(toggleId);
				expect(element.hasClass('row-split')).toBeTruthy();
			});
			it('should toggle to column-split if height < width', function () {
				spyOn(element, 'innerHeight').and.returnValue(10);
				spyOn(element, 'innerWidth').and.returnValue(11);
				underTest.toggle(toggleId);
				expect(element.hasClass('column-split')).toBeTruthy();
			});
			it('should toggle to column-split if height same as width', function () {
				spyOn(element, 'innerHeight').and.returnValue(10);
				spyOn(element, 'innerWidth').and.returnValue(10);
				underTest.toggle(toggleId);
				expect(element.hasClass('column-split')).toBeTruthy();
			});
			it('should toggle to no-split if currently column-split', function () {
				element.addClass('column-split');
				underTest.toggle(toggleId);
				expect(element.hasClass('no-split')).toBeTruthy();
			});
			it('should toggle to no-split if currently row-split', function () {
				element.addClass('row-split');
				underTest.toggle(toggleId);
				expect(element.hasClass('no-split')).toBeTruthy();
			});
			it('should show only the toggled element', function () {
				underTest.toggle(toggleId);
				expect(jQuery('#test1').css('display')).not.toBe('none');
				expect(jQuery('#test2').css('display')).toBe('none');
			});
		});
		describe('when toggleid is different', function () {
			beforeEach(function () {
				toggleId = 'test2';
			});
			it('should not toggle to no-split if currently column-split', function () {
				element.addClass('column-split');
				underTest.toggle(toggleId);
				expect(element.hasClass('no-split')).toBeFalsy();
				expect(element.hasClass('column-split')).toBeTruthy();
			});
			it('should not toggle to no-split if currently row-split', function () {
				element.addClass('row-split');
				underTest.toggle(toggleId);
				expect(element.hasClass('no-split')).toBeFalsy();
				expect(element.hasClass('row-split')).toBeTruthy();
			});
			it('should show only the toggled element', function () {
				underTest.toggle(toggleId);
				expect(jQuery('#test1').css('display')).toBe('none');
				expect(jQuery('#test2').css('display')).not.toBe('none');
			});

		});
		describe('event processing', [
				['first show of same',		MM.SplittableController.NO_SPLIT,  'test1', 'test1', ['test1'],	[]],
				['first show of different', MM.SplittableController.NO_SPLIT,  'test1', 'test2', ['test2'],	[]],
				['showing different',		MM.SplittableController.ROW_SPLIT, 'test1', 'test2', ['test2'],	['test1']],
				['hiding',					MM.SplittableController.ROW_SPLIT, 'test1', 'test1', [],		['test1']]
			], function (currentSplit, currentlyInArea, toggleId, expectedShowEvent, expectedHideEvent) {
				var events = { hide: [], show: [] };
				element.addClass(currentSplit);
				jQuery('[data-mm-role=optional-content]').hide().on('hide show', function (e) {
					events[e.type].push(jQuery(this).attr('id'));
				});
				jQuery('#' + currentlyInArea).show();
				underTest.toggle(toggleId);
				expect(events.hide).toEqual(expectedHideEvent);
				expect(events.show).toEqual(expectedShowEvent);
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
		it('does not dispatch events when just doing a different split', function () {
			var listener = jasmine.createSpy('show or hide');
			jQuery('[data-mm-role=optional-content]').on('hide show', listener);
			element.addClass('column-split');
			underTest.flip();

			expect(listener).not.toHaveBeenCalled();
		});
	});
});
