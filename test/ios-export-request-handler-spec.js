/*global describe, beforeEach, MM, jasmine, observable, it, expect, jQuery, afterEach, spyOn*/

describe('MM.IOS.ExportRequestHandler', function () {
	'use strict';
	var underTest, serverConnector, activityLog, activeContentListener, goldApi, s3Api;
	beforeEach(function () {
		activityLog = jasmine.createSpyObj('activityLog', ['log']);
		goldApi = {};
		s3Api = {};
		serverConnector = observable({'goldApi': goldApi, 's3Api': s3Api});
		activeContentListener = {};
		underTest = new MM.IOS.ExportRequestHandler(serverConnector, activityLog, activeContentListener);
	});
	describe('handlesCommand', function () {
		it('should be true for exportRequest', function () {
			expect(underTest.handlesCommand({type: 'exportRequest'})).toBeTruthy();
		});
		it('should be false for other type', function () {
			expect(underTest.handlesCommand({type: 'exportRequests'})).toBeFalsy();
		});
		it('should be false no type', function () {
			expect(underTest.handlesCommand({typeo: 'exportRequest'})).toBeFalsy();
		});
	});
	describe('handleCommand', function () {
		var listener, widget;
		beforeEach(function () {
			widget = jQuery('<div/>').appendTo('body');
			listener = jasmine.createSpy('listener');
			underTest.addEventListener('exportRequest', listener);
		});
		afterEach(function () {
			widget.remove();
		});
		it('should dispatch an exportRequest event', function () {
			underTest.handleCommand({type: 'exportRequest', args:['paper']});
			expect(listener).toHaveBeenCalledWith('paper', jasmine.any(Function));
		});
		it('should set up layoutExportWidget in callback function', function () {
			underTest.handleCommand({type: 'exportRequest', args:['paper']});
			var callbackFunc = listener.calls.mostRecent().args[1];
			spyOn(jQuery.fn, 'layoutExportWidget').and.callThrough();
			callbackFunc(widget);
			expect(jQuery.fn.layoutExportWidget).toHaveBeenCalledOnJQueryObject(widget);
		});
		it('should set up atlasPrepopulationWidget in callback function', function () {
			underTest.handleCommand({type: 'exportRequest', args:['paper']});
			var callbackFunc = listener.calls.mostRecent().args[1];
			spyOn(jQuery.fn, 'atlasPrepopulationWidget').and.callThrough();
			callbackFunc(widget);
			expect(jQuery.fn.atlasPrepopulationWidget).toHaveBeenCalledOnJQueryObject(widget);
		});
	});
	describe('serverConnectorChanged event', function () {
		it('should cause build of new MM.LayoutExportController', function () {
			spyOn(MM, 'LayoutExportController').and.callThrough();
			serverConnector.dispatchEvent('serverConnectorChanged');
			expect(MM.LayoutExportController).toHaveBeenCalledWith(jasmine.any(Object), goldApi, s3Api, activityLog);
			var handlers = MM.LayoutExportController.calls.mostRecent().args[0];
			expect(handlers['publish.json']).not.toBeUndefined();
		});
	});
});
