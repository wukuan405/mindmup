/*global describe, beforeEach, afterEach, jQuery, jasmine, expect, it*/
describe('iosAppStoreAlertWidget', function () {
	'use strict';
	var template = '<div name="ios-alert-message" data-mm-role="ios-appstore-alert">message for ios users<button data-mm-role="ios-appstore-alert-hide"</button></div>',
		tagElement,
		underTest,
		alertController,
		alertid,
		propertyStorage, propertyName;
	beforeEach(function () {
		alertid = 12;
		tagElement = jQuery('<div></div>').appendTo('body');
		alertController = jasmine.createSpyObj('alertController', ['show', 'hide']);
		alertController.show.and.returnValue(alertid);
		propertyName = 'ios-alert-hide';
		propertyStorage = jasmine.createSpyObj('propertyStorage', ['setItem', 'getItem']);
		underTest = jQuery(template).appendTo('body');
	});
	afterEach(function () {
		underTest.remove();
		tagElement.remove();
	});
	describe('when ios', function () {
		beforeEach(function () {
			tagElement.addClass('ios');
			propertyStorage.getItem.and.returnValue(undefined);
			underTest.iosAppStoreAlertWidget(propertyStorage, propertyName, tagElement, alertController);
		});
		it('should show an alert', function () {
			expect(alertController.show).toHaveBeenCalled();
			var message = alertController.show.calls.mostRecent().args[0];
			expect(jQuery(message).attr('name')).toEqual('ios-alert-message');
		});
		it('should add a marker property when the do not show again button is clicked', function () {
			underTest.find('[data-mm-role="ios-appstore-alert-hide"]').click();
			expect(propertyStorage.setItem).toHaveBeenCalledWith(propertyName, true);
		});
		it('should hide the alert when do not show again is clicked', function () {
			underTest.find('[data-mm-role="ios-appstore-alert-hide"]').click();
			expect(alertController.hide).toHaveBeenCalledWith(alertid);
		});
	});

	it('should not show an alert when ios and marked as do not show again', function () {
		tagElement.addClass('ios');
		propertyStorage.getItem.and.returnValue(propertyName);
		underTest.iosAppStoreAlertWidget(propertyStorage, propertyName, tagElement, alertController);
		expect(propertyStorage.getItem).toHaveBeenCalledWith(propertyName);
		expect(alertController.show).not.toHaveBeenCalled();
	});

	it('should not show an alert when not ios', function () {
		propertyStorage.getItem.and.returnValue(undefined);
		underTest.iosAppStoreAlertWidget(propertyStorage, propertyName, tagElement, alertController);
		expect(alertController.show).not.toHaveBeenCalled();
	});
});
