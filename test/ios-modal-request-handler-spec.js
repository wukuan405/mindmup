/*global describe, jQuery, beforeEach, afterEach, MM, it, expect, spyOn, jasmine*/

describe('MM.IOS.ModalRequestHandler', function () {
	'use strict';
	var underTest, modalWidget, button, buttonClick;
	beforeEach(function () {
		modalWidget = jQuery('<div data-mm-role="test-modal-ios"/>').appendTo('body');
		button = jQuery('<a href="#" data-mm-ios-role="test-button-click"></a>').appendTo('body');
		buttonClick = jasmine.createSpy();
		button.click(buttonClick);
		modalWidget.hide();
		underTest = new MM.IOS.ModalRequestHandler('test-modal-ios');
		spyOn(jQuery.fn, 'hideModal').and.callThrough();
	});
	afterEach(function () {
		modalWidget.remove();
		button.remove();
	});
	describe('handlesCommand', function () {
		it('returns true if command.type is modal', function () {
			expect(underTest.handlesCommand({type: 'modal'})).toBeTruthy();
		});
		it('returns false if command.type is undefined', function () {
			expect(underTest.handlesCommand({typeo: 'modal'})).toBeFalsy();
		});
		it('returns false if command type is undefined', function () {
			expect(underTest.handlesCommand()).toBeFalsy();
		});
		it('returns false if command.type is not modal', function () {
			expect(underTest.handlesCommand({type: 'moodal'})).toBeFalsy();
		});
	});
	describe('handleCommand', function () {
		it('should call hideModal if arg is hide', function () {
			underTest.handleCommand({type: 'modal', args: ['hide']});
			expect(jQuery.fn.hideModal).toHaveBeenCalledOnJQueryObject(modalWidget);
		});
		it('should not call hideModal if arg is not recognised', function () {
			underTest.handleCommand({type: 'modal', args: ['hidee']});
			expect(jQuery.fn.hideModal).not.toHaveBeenCalled();
		});
		it('should not call hideModal if arg is missing', function () {
			underTest.handleCommand({type: 'modal', args: []});
			expect(jQuery.fn.hideModal).not.toHaveBeenCalled();
		});
		it('should call click event on matching button', function () {
			underTest.handleCommand({type: 'modal', args: ['test-button-click']});
			expect(buttonClick).toHaveBeenCalled();
		});
	});
});
