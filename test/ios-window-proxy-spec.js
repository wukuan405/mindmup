/*global describe, it, expect, beforeEach, MM, jQuery, afterEach, spyOn, window, jasmine */
describe('MM.IOS.WindowProxy', function () {
	'use strict';
	var underTest,
		idea,
		mapModel,
		hidePopoverListener1,
		hidePopoverListener2,
		template = '<div><div id="listener1" data-mm-role="ios-context-menu"></div><div id="listener2" data-mm-role="ios-link-editor"></div></div>',
		elements,
		viewPortAdded,
		mmProxy,
		resourceCompressor;
	beforeEach(function () {
		if (jQuery('meta[name=viewport]').length === 0) {
			viewPortAdded = jQuery('<meta name="viewport" content="user-scalable=no, minimum-scale=1, maximum-scale=1, width=device-width">').appendTo('head');
		}

		mapModel = jasmine.createSpyObj('mapModel', ['centerOnNode', 'getSelectedNodeId', 'resetView', 'scaleDown', 'getIdea']);
		mmProxy = jasmine.createSpyObj('mmProxy', ['sendMessage']);
		resourceCompressor = jasmine.createSpyObj('resourceCompressor', ['compress']);

		mapModel.getSelectedNodeId.and.returnValue(1);
		idea = {id: 1, title: 'hello'};
		mapModel.getIdea.and.returnValue(idea);
		hidePopoverListener1 = jasmine.createSpy('hidePopoverListener1');
		hidePopoverListener2 = jasmine.createSpy('hidePopoverListener2');
		elements = jQuery(template).appendTo('body');
		elements.find('#listener1').on('hidePopover', hidePopoverListener1);
		elements.find('#listener2').on('hidePopover', hidePopoverListener2);
		underTest = new MM.IOS.WindowProxy(mapModel, mmProxy, resourceCompressor);
	});
	afterEach(function () {
		elements.remove();
		if (viewPortAdded) {
			viewPortAdded.remove();
		}
	});
	describe('handlesCommand', function () {
		it('should recognise a setViewPort Command', function () {
			var result = underTest.handlesCommand({type: 'setViewport'});
			expect(result).toBeTruthy();
		});
		it('should recognise a prepareForSave command', function () {
			var result = underTest.handlesCommand({type: 'prepareForSave'});
			expect(result).toBeTruthy();
		});
		it('should not recognise an unknown commande', function () {
			var result = underTest.handlesCommand({type: 'wha'});
			expect(result).toBeFalsy();

		});
	});
	describe('handleCommand', function () {
		var fastForwardTimeout = function () {
			var lastCall = window.setTimeout.calls.first();
			window.setTimeout.calls.reset();
			if (lastCall && lastCall.args) {
				lastCall.args[0]();
			}
		};
		beforeEach(function () {
			spyOn(window, 'setTimeout').and.callThrough();
		});
		describe('prepareForSave command', function () {
			var command;
			beforeEach(function () {
				command = {type: 'prepareForSave'};
			});
			it('should reset the map view', function () {
				underTest.handleCommand(command);
				expect(mapModel.resetView).toHaveBeenCalled();
			});
			it('should send events to elements listening for hidePopover', function () {
				underTest.handleCommand(command);
				expect(hidePopoverListener1).toHaveBeenCalled();
				expect(hidePopoverListener2).toHaveBeenCalled();
			});
			it('should set timeout for when the screen has updated', function () {
				underTest.handleCommand(command);
				expect(window.setTimeout).toHaveBeenCalledWith(jasmine.any(Function), 100);
			});
			describe('when saving the screen only', function () {
				beforeEach(function () {
					command.args = ['save-screen-only'];
					underTest.handleCommand(command);
					fastForwardTimeout();
					fastForwardTimeout();
				});
				it('should send a message to the message proxy', function () {
					expect(mmProxy.sendMessage).toHaveBeenCalledWith({type : 'save-screen'});
				});
				it('should not compress resources', function () {
					expect(resourceCompressor.compress).not.toHaveBeenCalled();
				});
			});
			describe('when the initial timeout fires', function () {
				beforeEach(function () {
					underTest.handleCommand(command);
					fastForwardTimeout();
				});
				it('should scale down the map', function () {
					expect(mapModel.scaleDown).toHaveBeenCalled();
				});
				it('should set a timeout for after the screen has scaled down', function () {
					expect(window.setTimeout).toHaveBeenCalledWith(jasmine.any(Function), 100);
				});
				describe('when the scaled down timeout fires', function () {
					beforeEach(function () {
						fastForwardTimeout();
					});
					it('should send a message to the message proxy', function () {
						expect(mmProxy.sendMessage).toHaveBeenCalledWith({type: 'save-content', args: {'title': 'hello', 'idea': JSON.stringify(idea)}});
					});
					it('should compress resources', function () {
						expect(resourceCompressor.compress).toHaveBeenCalled();
					});
				});
			});
		});
		describe('setViewPort command', function () {
			var command,
				originalViewPort;
			beforeEach(function () {
				originalViewPort = jQuery('meta[name=viewport]').attr('content');
				command = {type: 'setViewport', args: originalViewPort};
			});
			afterEach(function () {
				jQuery('meta[name=viewport]').attr('content', originalViewPort);
			});
			it('should do nothing if the viewport is already set to the same value', function () {
				command.args = originalViewPort;
				underTest.handleCommand(command);
				expect(window.setTimeout).not.toHaveBeenCalled();
				expect(hidePopoverListener1).not.toHaveBeenCalled();
				expect(hidePopoverListener2).not.toHaveBeenCalled();
			});
			describe('when the command is changing the viewport', function () {
				beforeEach(function () {
					command.args = 'user-scalable=yes, minimum-scale=1, maximum-scale=1, width=device-width';
				});
				it('should update the viewport meta data', function () {
					underTest.handleCommand(command);
					var result = jQuery('meta[name=viewport]').attr('content');
					expect(result).toEqual(command.args);
				});
				it('should send events to elements listening for hidePopover', function () {
					underTest.handleCommand(command);
					expect(hidePopoverListener1).toHaveBeenCalled();
					expect(hidePopoverListener2).toHaveBeenCalled();
				});
				it('should set a timeout to recenter the currently selected node', function () {
					underTest.handleCommand(command);
					expect(window.setTimeout).toHaveBeenCalled();
					var lastCall = window.setTimeout.calls.first();
					if (lastCall && lastCall.args) {
						lastCall.args[0]();
					}
					expect(mapModel.centerOnNode).toHaveBeenCalledWith(1);
				});
			});
		});
	});
});
