/*global MM, describe, beforeEach, observable, it, jasmine, expect, spyOn*/
describe('MM.ActiveContentListener', function () {
	'use strict';
	var underTest, mapController, onChangeFunction1, onChangeFunction2, activeContent;
	beforeEach(function () {
		onChangeFunction1 = jasmine.createSpy('onChangeFunction1');
		onChangeFunction2 = jasmine.createSpy('onChangeFunction2');
		mapController = observable({});
		underTest = new MM.ActiveContentListener(mapController);
		activeContent = observable({});
		spyOn(activeContent, 'addEventListener').and.callThrough();

	});
	it('should return undefined as active content before a map is loaded', function () {
		expect(underTest.getActiveContent()).toBeUndefined();
	});
	it('should call listener when added if the active content is already loaded, but not existing listeners', function () {
		underTest.addListener(onChangeFunction2);
		mapController.dispatchEvent('mapLoaded', 'loadedMapId', activeContent);
		onChangeFunction2.calls.reset();
		underTest.addListener(onChangeFunction1);
		expect(onChangeFunction1).toHaveBeenCalledWith(activeContent, false);
		expect(onChangeFunction2).not.toHaveBeenCalled();
	});
	it('should not call listener when added if the active content is not already loaded', function () {
		underTest.addListener(onChangeFunction1);
		expect(onChangeFunction1).not.toHaveBeenCalled();
	});
	describe('after first map is loaded', function () {
		beforeEach(function () {
			underTest.addListener(onChangeFunction1);
			underTest.addListener(onChangeFunction2);
			mapController.dispatchEvent('mapLoaded', 'loadedMapId', activeContent);
		});
		it('getActiveContent should return active content', function () {
			expect(underTest.getActiveContent()).toBe(activeContent);
		});
		it('should subscribe to loaded activeContent changed event', function () {
			expect(activeContent.addEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
		});
		it('should call listeners when map is loaded', function () {
			expect(onChangeFunction1).toHaveBeenCalledWith(activeContent, true);
			expect(onChangeFunction2).toHaveBeenCalledWith(activeContent, true);
		});
		it('should call listeners when active content changed', function () {
			onChangeFunction1.calls.reset();
			onChangeFunction2.calls.reset();
			activeContent.dispatchEvent('changed', 'methodarg', ['foo', 'bar']);
			expect(onChangeFunction1).toHaveBeenCalledWith(activeContent, false, 'methodarg', ['foo', 'bar']);
			expect(onChangeFunction2).toHaveBeenCalledWith(activeContent, false, 'methodarg', ['foo', 'bar']);
		});
		it('should ignore session ID when included in the change event', function () {
			onChangeFunction1.calls.reset();
			onChangeFunction2.calls.reset();
			activeContent.dispatchEvent('changed', 'methodarg', ['foo', 'bar'], 'sessionkey');
			expect(onChangeFunction1).toHaveBeenCalledWith(activeContent, false, 'methodarg', ['foo', 'bar']);
			expect(onChangeFunction2).toHaveBeenCalledWith(activeContent, false, 'methodarg', ['foo', 'bar']);
		});
		describe('when subsequent maps are loaded', function () {
			var newActiveContent;
			beforeEach(function () {
				newActiveContent = observable({});
				spyOn(newActiveContent, 'addEventListener').and.callThrough();
				spyOn(activeContent, 'removeEventListener').and.callThrough();
				onChangeFunction1.calls.reset();
				onChangeFunction1.calls.reset();
				mapController.dispatchEvent('mapLoaded', 'newMapId', newActiveContent);
			});
			it('getActiveContent should return latest active content', function () {
				expect(underTest.getActiveContent()).toBe(newActiveContent, true);
			});
			it('should unsubscribe from old activeContent changed event', function () {
				expect(activeContent.removeEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
			});
			it('should subscribe to new activeContent changed event', function () {
				expect(newActiveContent.addEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
			});
			it('should call listeners when active content changed', function () {
				onChangeFunction1.calls.reset();
				onChangeFunction2.calls.reset();
				newActiveContent.dispatchEvent('changed', 'newmethodarg', ['bar', 'foo']);
				expect(onChangeFunction1.calls.count()).toBe(1);
				expect(onChangeFunction2.calls.count()).toBe(1);
				expect(onChangeFunction1).toHaveBeenCalledWith(newActiveContent, false, 'newmethodarg', ['bar', 'foo']);
				expect(onChangeFunction2).toHaveBeenCalledWith(newActiveContent, false, 'newmethodarg', ['bar', 'foo']);
			});
			it('should ignore session key', function () {
				onChangeFunction1.calls.reset();
				onChangeFunction2.calls.reset();
				newActiveContent.dispatchEvent('changed', 'newmethodarg', ['bar', 'foo'], 'sessionkey');
				expect(onChangeFunction1.calls.count()).toBe(1);
				expect(onChangeFunction2.calls.count()).toBe(1);
				expect(onChangeFunction1).toHaveBeenCalledWith(newActiveContent, false, 'newmethodarg', ['bar', 'foo']);
				expect(onChangeFunction2).toHaveBeenCalledWith(newActiveContent, false, 'newmethodarg', ['bar', 'foo']);
			});
		});
	});
});
