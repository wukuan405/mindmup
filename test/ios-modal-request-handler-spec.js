/*global describe, jQuery, beforeEach, afterEach, MM, it, expect, spyOn*/

describe('MM.IOS.ModalRequestHandler', function () {
	'use strict';
	var underTest, modalWidget;
	beforeEach(function () {
		modalWidget = jQuery('<div data-mm-role="test-modal-ios"/>').appendTo('body');
		modalWidget.hide();
		underTest = new MM.IOS.ModalRequestHandler('test-modal-ios');
		spyOn(jQuery.fn, 'hideModal').and.callThrough();
	});
	afterEach(function () {
		modalWidget.remove();
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
		it('should not call hideModal if arg is not hide', function () {
			underTest.handleCommand({type: 'modal', args: ['hidee']});
			expect(jQuery.fn.hideModal).not.toHaveBeenCalled();
		});
		it('should not call hideModal if arg is missing', function () {
			underTest.handleCommand({type: 'modal', args: []});
			expect(jQuery.fn.hideModal).not.toHaveBeenCalled();
		});
	});
});
