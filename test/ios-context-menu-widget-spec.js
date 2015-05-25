/* global describe, it, beforeEach, afterEach, expect, jQuery, observable, jasmine*/
describe('iosContextMenuWidget', function () {
	'use strict';
	var template =  '<div>' +
										'<div data-mm-role="context-menu-toolbar"></div>' +
										'<div data-mm-role="context-menu-tool-container"></div>' +
									'</div>',
			tTemplate = '<div>' +
										'<button data-mm-role="tool"></button>' +
										'<button data-mm-role="tool"></button>' +
									'</div>',
			underTest,
			tools,
			mapModel;
	beforeEach(function () {
		mapModel = observable({});
		tools = jQuery(tTemplate).appendTo('body');
		underTest = jQuery(template).appendTo('body').iosContextMenuWidget(mapModel, tools.find('[data-mm-role=tool]')).hide();
	});
	afterEach(function () {
		underTest.remove();
		tools.remove();
	});
	it('should trigger showPopover event when context menu is requested', function () {
		var spy = jasmine.createSpy('showPopover');
		underTest.on('showPopover', spy);
		mapModel.dispatchEvent('contextMenuRequested', 1, 20, 30);
		expect(spy).toHaveBeenCalled();
		expect(spy.calls.mostRecent().args[0].x).toBe(20);
		expect(spy.calls.mostRecent().args[0].y).toBe(30);
	});
	it('should not trigger showPopover event when context menu is requested is editing is not enabled', function () {
		mapModel.getEditingEnabled = function () {
			return false;
		};

		var spy = jasmine.createSpy('showPopover');
		underTest.on('showPopover', spy);
		mapModel.dispatchEvent('contextMenuRequested', 1, 20, 30);
		expect(spy).not.toHaveBeenCalled();
	});
	it('should clone tools to tool container', function () {
		expect(underTest.find('[data-mm-role=tool]').length).toBe(2);
		tools.remove();
		expect(underTest.find('[data-mm-role=tool]').length).toBe(2);
	});
	it('should trigger hidePopover event when a cloned tool is clicked', function () {
		var spy = jasmine.createSpy('hidePopover');
		underTest.on('hidePopover', spy);
		jQuery(underTest.find('[data-mm-role=tool]')[0]).click();
		expect(spy).toHaveBeenCalled();
	});
});
