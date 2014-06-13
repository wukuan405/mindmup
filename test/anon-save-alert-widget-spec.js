/*global jasmine, jQuery, describe, beforeEach, observable, it, expect, _*/
describe('AnonSaveAlertWidget', function () {
	'use strict';
	var underTest, mapController, alertController, propertyStorage, mapSource,
		template = '<div><span data-mm-role="destroyed">Destroyed</span><span data-mm-role="destroyed-problem">Destroyed problem</span>' +
					'<span data-mm-role="anon-save"><div>AAA<a data-mm-role="destroy">D</a><input type="checkbox" data-mm-role="donotshow"]>X</input></div></span>' +
					'</div>';
	beforeEach(function () {
		mapController = observable({});
		alertController = jasmine.createSpyObj('alert', ['show', 'hide']);
		mapSource = jasmine.createSpyObj('mapSource', ['recognises', 'destroyLastSave']);
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
			expect(alertController.show.calls.mostRecent().args[0].is('span')).toBeTruthy();
			expect(alertController.show.calls.mostRecent().args[0].html()).toEqual(jQuery(template).find('[data-mm-role=anon-save]').html());
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
			describe('when the donotshow checkbox inside the message is clicked', function () {
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
				it('does not call S3 API to destroy last save', function () {
					expect(mapSource.destroyLastSave).not.toHaveBeenCalled();
				});
			});
			describe('when the destroy button inside the message is clicked', function () {
				var destroyPromise;
				beforeEach(function () {
					var link;
					destroyPromise = jQuery.Deferred();
					alertController.show.and.returnValue(alertId);
					mapController.dispatchEvent('mapSaved', mapId);
					mapSource.destroyLastSave.and.returnValue(destroyPromise);
					link = alertController.show.calls.mostRecent().args[0].find('a');
					alertController.show.calls.reset();
					link.click();
				});
				it('dismisses the alert', function () {
					expect(alertController.hide).toHaveBeenCalledWith(alertId);
				});
				it('calls S3 API to destroy last save', function () {
					expect(mapSource.destroyLastSave).toHaveBeenCalled();
					expect(alertController.show).not.toHaveBeenCalled();
				});
				it('shows the destroy success when the destroy call resolves', function () {
					destroyPromise.resolve();
					expect(alertController.show).toHaveBeenCalled();
					expect(alertController.show.calls.mostRecent().args[2]).toBe('info');
					expect(alertController.show.calls.mostRecent().args[0].html()).toEqual(jQuery(template).find('[data-mm-role=destroyed]').html());
				});
				it('shows the destroy failure alert when the destroy call fails', function () {
					destroyPromise.reject();
					expect(alertController.show).toHaveBeenCalled();
					expect(alertController.show.calls.mostRecent().args[2]).toBe('error');
					expect(alertController.show.calls.mostRecent().args[0].html()).toEqual(jQuery(template).find('[data-mm-role=destroyed-problem]').html());
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
