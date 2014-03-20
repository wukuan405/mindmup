/*global jasmine, jQuery, describe, beforeEach, observable, it, expect, _*/
describe('AnonSaveAlertWidget', function () {
	'use strict';
	var underTest, mapController, alertController, propertyStorage, mapSource,
		template = '<div>AAA<input type="checkbox">X</input></div>';
	beforeEach(function () {
		mapController = observable({});
		alertController = jasmine.createSpyObj('alert', ['show', 'hide']);
		mapSource = jasmine.createSpyObj('mapSource', ['recognises']);
		propertyStorage = jasmine.createSpyObj('propstore', ['setItem', 'getItem']);
		underTest = jQuery(template).anonSaveAlertWidget(alertController, mapController, mapSource, propertyStorage, 'testprop');
	});
	describe('when not turned off in properties', function () {
		var mapId = 'MAPID',
			alertId = 11;
		beforeEach(function () {
			mapSource.recognises.and.returnValue(true);
		});
		it('shows an alert when map is saved with a recognised prefix', function () {
			mapController.dispatchEvent('mapSaved', mapId);

			expect(alertController.show).toHaveBeenCalled();
			expect(alertController.show.calls.mostRecent().args[2]).toBe('success');
			expect(alertController.show.calls.mostRecent().args[0].is('div')).toBeTruthy();
			expect(alertController.show.calls.mostRecent().args[0].html()).toEqual(jQuery(template).html());
		});
		it('does not show an alert when map is saved with some other prefix', function () {
			mapSource.recognises.and.returnValue(false);
			mapController.dispatchEvent('mapSaved', mapId);
			expect(alertController.show).not.toHaveBeenCalled();

		});
		describe('after the alert is shown', function () {

			beforeEach(function () {
				alertController.show.and.returnValue(alertId);
				mapController.dispatchEvent('mapSaved', mapId);
				alertController.hide.calls.reset();
			});
			_.each(['mapSaving', 'mapLoaded'], function (eventName) {
				it('hides a previous alert when a map is ' + eventName, function () {
					mapController.dispatchEvent(eventName, 'xxx');
					expect(alertController.hide).toHaveBeenCalledWith(alertId);
				});
			});
			describe('when a checkbox inside the message is clicked', function () {
				beforeEach(function () {
					alertController.show.and.returnValue(alertId);
					mapController.dispatchEvent('mapSaved', mapId);
					alertController.show.calls.mostRecent().args[0].find('input').click();
				});
				it('dismisses the alert', function () {
					expect(alertController.hide).toHaveBeenCalledWith(alertId);
				});
				it('disables future alerts', function () {
					expect(propertyStorage.setItem).toHaveBeenCalledWith('testprop', true);
				});
			});
		});
	});
	describe('when turned off in properties', function () {
		it('does not show an alert when map is saved with an a prefix', function () {
			propertyStorage.getItem.and.returnValue(true);
			mapSource.recognises.and.returnValue(true);
			mapController.dispatchEvent('mapSaved', 'xxxx');
			expect(alertController.show).not.toHaveBeenCalled();
		});
	});
});
