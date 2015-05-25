/*global jasmine, jQuery, describe, expect, observable, beforeEach, afterEach, it, spyOn, _*/
describe('collaboratorSpeechBubbleWidget', function () {
	'use strict';
	var collaborationModel, underTest,
			template = '<div> ' +
								'		<div data-mm-role="popover-content-template"><div class="speech-bubble-inner"><span data-mm-role="popover-content"></span></div></div>' +
								'		<div data-mm-role="popover-title-template"><div class="speech-bubble-title"><span data-mm-role="popover-title"></span></div></div>' +
								'		<img data-mm-role="collaborator-photo"/>' +
								'</div>',
			timeout,
			collaborator,
			photo;
	beforeEach(function () {
		timeout = 500;
		collaborationModel = observable(jasmine.createSpyObj('collaborationModel', ['showCollaborator']));
		collaborator = {
			photoUrl: 'http://x/y/z',
			name: 'Michael Bubble',
			color: 'pink'
		};
		underTest = jQuery(template).appendTo('body').collaboratorSpeechBubbleWidget(collaborationModel, timeout);
		jasmine.clock().install();
		spyOn(jQuery.fn, 'fadeIn').and.callThrough();
		spyOn(jQuery.fn, 'popover');
		spyOn(jQuery.fn, 'css').and.callThrough();
		spyOn(jQuery.fn, 'fadeOut').and.callThrough();
		photo = underTest.find('img');
	});
	afterEach(function () {
		jasmine.clock().uninstall();
		underTest.remove();
	});
	_.each(['collaboratorJoined', 'collaboratorLeft', 'collaboratorDidEdit'], function (eventName) {
		describe('setup for ' + eventName, function () {
			it('attaches a click handler to the collaborator photo to show the collaborator', function () {
				collaborationModel.dispatchEvent(eventName, collaborator);
				photo.trigger('tap');
				expect(collaborationModel.showCollaborator).toHaveBeenCalledWith(collaborator);
			});
			it('destroys the image popover, then redefines and shows it', function () {
				collaborationModel.dispatchEvent(eventName, collaborator);
				expect(jQuery.fn.popover).toHaveBeenCalledOnJQueryObject(photo);
				expect(jQuery.fn.popover.calls.argsFor(0)).toEqual(['destroy']);
				expect(jQuery.fn.popover.calls.argsFor(2)).toEqual(['show']);
			});
			it('puts the collaborator photo and color on the image', function () {
				collaborationModel.dispatchEvent(eventName, collaborator);
				expect(jQuery.fn.css).toHaveBeenCalledOnJQueryObject(photo);
				expect(jQuery.fn.css).toHaveBeenCalledWith('border-color', collaborator.color);
				expect(photo.attr('src')).toEqual(collaborator.photoUrl);
			});
			it('fades in the image', function () {
				collaborationModel.dispatchEvent(eventName, collaborator);
				expect(jQuery.fn.fadeIn).toHaveBeenCalledOnJQueryObject(underTest);
			});
			it('schedule a timeout after fadein to destroy the popover and fade out the element', function () {
				collaborationModel.dispatchEvent(eventName, collaborator);
				jQuery.fn.popover.calls.reset();
				jasmine.clock().tick(timeout + 200);
				expect(jQuery.fn.popover).toHaveBeenCalledOnJQueryObject(photo);
				expect(jQuery.fn.popover).toHaveBeenCalledWith('destroy');
				expect(jQuery.fn.fadeOut).toHaveBeenCalledOnJQueryObject(underTest);
			});
		});
	});
	it('shows a collaborator joined message when a collaborator joins', function () {
		collaborationModel.dispatchEvent('collaboratorJoined', collaborator);
		expect(jQuery.fn.popover).toHaveBeenCalledWith({
			title:'<div class="speech-bubble-title"><span data-mm-role="popover-title">Michael Bubble</span></div>',
			content: '<div class="speech-bubble-inner"><span data-mm-role="popover-content" class="muted">joined the session</span></div>',
			placement: 'right',
			trigger: 'manual',
			animation: true,
			html: true
		});
	});
	it('shows a collaborator left message when a collaborator leaves', function () {
		collaborationModel.dispatchEvent('collaboratorLeft', collaborator);
		expect(jQuery.fn.popover).toHaveBeenCalledWith({
			title:'<div class="speech-bubble-title"><span data-mm-role="popover-title">Michael Bubble</span></div>',
			content: '<div class="speech-bubble-inner"><span data-mm-role="popover-content" class="muted">left the session</span></div>',
			placement: 'right',
			trigger: 'manual',
			animation: true,
			html: true
		});
	});
	it('shows the new node title when a collaborator edits a node', function () {
		collaborationModel.dispatchEvent('collaboratorDidEdit', collaborator, {title: 'new title'});
		expect(jQuery.fn.popover).toHaveBeenCalledWith({
			title:'<div class="speech-bubble-title"><span data-mm-role="popover-title">Michael Bubble</span></div>',
			content: '<div class="speech-bubble-inner"><span data-mm-role="popover-content">new title</span></div>',
			placement: 'right',
			trigger: 'manual',
			animation: true,
			html: true
		});
	});
	it('shows the removed title message when a collaborator edits a node and wipes out the title', function () {
		collaborationModel.dispatchEvent('collaboratorDidEdit', collaborator, {title: ''});
		expect(jQuery.fn.popover).toHaveBeenCalledWith({
			title:'<div class="speech-bubble-title"><span data-mm-role="popover-title">Michael Bubble</span></div>',
			content: '<div class="speech-bubble-inner"><span data-mm-role="popover-content" class="muted">removed node content</span></div>',
			placement: 'right',
			trigger: 'manual',
			animation: true,
			html: true
		});
	});
});
