/*global MM, describe, beforeEach, observable, it, jasmine*/
describe('MM.activeContentListener', function () {
	'use strict';
	var mapController, onChangeFunction;
	beforeEach(function () {
		onChangeFunction = jasmine.createSpy();
		mapController = observable({});
		MM.activeContentListener({}, mapController, onChangeFunction);
	});
	describe('before map is loaded', function () {
		it('should have undefined active content', function () {
			// expect(underTest.activeContent()).toBeUndefined();
		});
	});
	describe('when first map is loaded', function () {
		// var activeContent;
		beforeEach(function () {
			// activeContent = jasmine.createSpyObj('activeContent', ['addEventListener']);
			// mapController.dispatchEvent('mapLoaded', 'newMapId', activeContent);
		});
		it('should subscribe to loaded activeContent changed event', function () {
			// expect(activeContent.addEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
		});
		it('should call onChangeFunction when activeContent changed', function () {

		});

		describe('when subsequent maps are loaded', function () {
			// var newActiveContent;
			beforeEach(function () {
				// newActiveContent = jasmine.createSpyObj('activeContent');
				// mapController.dispatchEvent('mapLoaded', 'newMapId', newActiveContent);
			});
			it('should unsubscribe from old activeContent changed event', function () {

			});
			it('should subscribe to new activeContent changed event', function () {

			});
		});
	});
});