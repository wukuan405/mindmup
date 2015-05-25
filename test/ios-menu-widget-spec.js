/* global describe, it, beforeEach, afterEach, expect, jQuery, jasmine*/
describe('iosMenuWidget', function () {
	'use strict';
	var template =  '<div data-mm-default-menu="showsByDefault" data-mm-source="menuwidget">' +
										'<span data-mm-role="ios-menu-title">Menu is labeled like this initially</span>' +
										'<a data-mm-role="ios-menu-toggle"></a>' +
										'<div data-mm-role="ios-toolbar">' +
											'<div id="defaultMenuItem" data-mm-menu="showsByDefault" style"display:none" data-mm-menu-role="showMenu" data-mm-action="notshownByDefault"></div>' +
											'<div id="nonDefaultMenuItem" data-mm-menu="notshownByDefault" data-mm-menu-role="showMenu" data-mm-action="subsubmenu"></div>' +
											'<div data-mm-menu="subsubmenu" data-mm-menu-role="modelAction" data-mm-action="someMethod"></div>' +
											'<div id="sendMessageWithArgs" data-mm-menu="hiddenMenu" data-mm-menu-role="sendMessage" data-mm-message-type="hello" data-mm-message-args="you,there!"></div>' +
											'<div id="sendMessageWithNoArgs" data-mm-menu="hiddenMenu" data-mm-menu-role="sendMessage" data-mm-message-type="hello"></div>' +
											'<div id="showWidget" data-mm-menu="hiddenMenu" data-mm-menu-role="showWidget" data-mm-widget-role="some-widget"></div>' +
										'</div>' +
									'</div>',
			widget,
			mapModel,
			messageSender,
			underTest;
	beforeEach(function () {
		mapModel = jasmine.createSpyObj('mapModel', ['someMethod']);
		messageSender = jasmine.createSpyObj('messageSender', ['sendMessage']);
		widget = jQuery('<div id="widgetToShow" data-mm-role="some-widget" style="display:none"></div>').appendTo('body');
		underTest = jQuery(template).appendTo('body').iosMenuWidget(mapModel, messageSender);
	});
	afterEach(function () {
		underTest.remove();
		widget.remove();
	});
	it('shows the default menu initially', function () {
		expect(underTest.find('#defaultMenuItem').is(':visible')).toBeTruthy();
	});
	it('hides the non default menu initially', function () {
		expect(underTest.find('#nonDefaultMenuItem').is(':visible')).toBeFalsy();
	});
	it('should show a menu when data-mm-menu-role="showMenu" is clicked', function () {
		underTest.find('#defaultMenuItem').click();
		expect(underTest.find('#defaultMenuItem').is(':visible')).toBeFalsy();
		expect(underTest.find('#nonDefaultMenuItem').is(':visible')).toBeTruthy();
	});
	describe('menu items that call mapModel', function () {
		it('should execute a mapModel action when a modelAction menu item is clicked', function () {
			underTest.find('[data-mm-menu-role="modelAction"]').click();
			expect(mapModel.someMethod).toHaveBeenCalledWith('menuwidget');
		});
		it('should pass additional arguments if specified', function () {
			underTest.find('[data-mm-menu-role="modelAction"]').data('mm-model-args', ['a', 1]);
			underTest.find('[data-mm-menu-role="modelAction"]').click();
			expect(mapModel.someMethod).toHaveBeenCalledWith('menuwidget', 'a', 1);
		});
	});
	describe('menu items that send messages', function () {
		it('should send a message with args when a sendMessage menu item is clicked', function () {
			underTest.find('#sendMessageWithArgs').click();
			expect(messageSender.sendMessage).toHaveBeenCalledWith({type: 'hello',  args: ['you', 'there!']});
		});
		it('should send a message with no args when a sendMessage menu item is clicked', function () {
			underTest.find('#sendMessageWithNoArgs').click();
			expect(messageSender.sendMessage).toHaveBeenCalledWith({type: 'hello'});
		});
	});
	describe('menu items that show widgets', function () {
		it('should show an element when a showWidget menu item is clicked', function () {
			underTest.find('#showWidget').click();
			expect(jQuery('#widgetToShow').is(':visible')).toBeTruthy();
		});
		it('should pass additional arguments if specified', function () {
			jQuery('#widgetToShow').data('mm-model-args', undefined);
			underTest.find('#showWidget').data('mm-model-args', ['a', 1]);
			underTest.find('#showWidget').click();
			expect(jQuery('#widgetToShow').data('mm-model-args')).toEqual(['a', 1]);
		});
	});
	describe('menu toggle button', function () {
		it('should change the menu title to "back" when a sub menu is shown', function () {
			underTest.find('#defaultMenuItem').click();
			expect(underTest.find('[data-mm-role="ios-menu-title"]').text()).toBe('Back');
		});
		it('should hide the menu if the default menu is shown', function () {
			underTest.find('[data-mm-role="ios-menu-toggle"]').click();
			expect(underTest.find('[data-mm-role="ios-toolbar"]').is(':visible')).toBeFalsy();
		});
		it('should show the menu if the toolbar is hidden', function () {
			underTest.find('[data-mm-role="ios-toolbar"]').hide();
			underTest.find('[data-mm-role="ios-menu-toggle"]').click();
			expect(underTest.find('[data-mm-role="ios-toolbar"]').is(':visible')).toBeTruthy();
		});
		it('should return to the default menu if clicked when a sub menu is shown', function () {
			underTest.find('#defaultMenuItem').click();
			underTest.find('[data-mm-role="ios-menu-toggle"]').click();
			expect(underTest.find('#defaultMenuItem').is(':visible')).toBeTruthy();
			expect(underTest.find('[data-mm-role="ios-toolbar"]').is(':visible')).toBeTruthy();
		});
		it('should return to the intermediate parent menu if clicked when a sub menu is shown', function () {
			underTest.find('#defaultMenuItem').click();
			underTest.find('#nonDefaultMenuItem').click();

			underTest.find('[data-mm-role="ios-menu-toggle"]').click();

			expect(underTest.find('#nonDefaultMenuItem').is(':visible')).toBeTruthy();
			expect(underTest.find('[data-mm-role="ios-toolbar"]').is(':visible')).toBeTruthy();
		});
		it('should change the toggle title back to its original text when default menu is shown', function () {
			underTest.find('[data-mm-role="ios-menu-toggle"]').click();
			underTest.find('[data-mm-role="ios-menu-toggle"]').click();
			expect(underTest.find('[data-mm-role="ios-menu-title"]').text()).toBe('Menu is labeled like this initially');
		});
	});
});
