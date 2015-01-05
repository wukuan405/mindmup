/*global describe, beforeEach, observable, jasmine, jQuery, afterEach, it, expect */
describe('Collaborator Photo Widget', function () {
	'use strict';
	var underTest, collaborationModel, template ='<div><div id="node_124"></div><div id="node_125"></div></div>', imageLoader, loaderDeferred;
	beforeEach(function () {
		imageLoader = jasmine.createSpy('imageLoader').and.callFake(function () {
			loaderDeferred = jQuery.Deferred();
			return loaderDeferred.promise();
		});
		collaborationModel = observable(jasmine.createSpyObj('collaborationModel', ['toggleFollow']));
		underTest = jQuery(template).appendTo('body').collaboratorPhotoWidget(collaborationModel, imageLoader, 'mm-collaborator');
	});
	describe('collaboratorFocusChanged event handling', function () {
		var jQueryImage, secondImage;
		beforeEach(function () {
			jQueryImage = jQuery('<div>').css({width: 80, height: 60});
			secondImage = jQuery('<div>').css({width:50, height:20});
		});
		describe('when the collaborator image is not loaded yet', function () {
			it('loads the image using remote loader', function () {
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				expect(imageLoader).toHaveBeenCalledWith('http://x.y');
			});
			it('positions the image at the bottom right corner of the node', function (){
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(jQueryImage);

				expect(jQueryImage.parent()[0]).toBe(underTest.find('#node_124')[0]);
				expect(jQueryImage.css('bottom')).toBe('-30px');
				expect(jQueryImage.css('right')).toBe('-40px');
			});
			it('loads but does not position if the node does not exist', function () {
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '129'});
				loaderDeferred.resolve(jQueryImage);

				expect(imageLoader).toHaveBeenCalledWith('http://x.y');
				expect(jQueryImage.parent().length).toBe(0);
			});
//		it('positions the image if the node does not exist but appears later', function () { });
			it('sets up a tap event on the image to toggle following by session id', function () {
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(jQueryImage);
				jQueryImage.trigger('tap');

				expect(collaborationModel.toggleFollow).toHaveBeenCalledWith(123);
			});
			it('adds the image class', function () {
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(jQueryImage);

				expect(jQueryImage.hasClass('mm-collaborator')).toBeTruthy();
			});
		});
		describe('after the collaborator image is loaded', function () {
			beforeEach(function () {
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(jQueryImage);
				imageLoader.calls.reset();
			});
			it('reuses an existing image', function () {
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '125'});

				expect(imageLoader).not.toHaveBeenCalled();
			});
//		it('does not reuse the image when the URL changes', function () { });
			it('reuses the image even if the URL changes', function () {
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.z', sessionId: 123, focusNodeId: '125'});

				expect(imageLoader).not.toHaveBeenCalled();
			});
			it('repositions image to new node', function () {
				collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '125'});

				expect(jQueryImage.parent()[0]).toBe(underTest.find('#node_125')[0]);
				expect(jQueryImage.css('bottom')).toBe('-30px');
				expect(jQueryImage.css('right')).toBe('-40px');
			});
			it('drops the image if the collaborator leaves', function () {
				collaborationModel.dispatchEvent('collaboratorPresenceChanged', {sessionId: 123}, false);
				expect(jQueryImage.parent().length).toBe(0);
			});
			it('shows the image again if the collaborator re-appears', function () {
				collaborationModel.dispatchEvent('collaboratorPresenceChanged', {sessionId: 123}, false);
				collaborationModel.dispatchEvent('collaboratorPresenceChanged', {sessionId: 123, focusNodeId:'124'}, true);
				loaderDeferred.resolve(jQueryImage);
				expect(jQueryImage.parent()[0]).toBe(underTest.find('#node_124')[0]);
			});
			describe('does not cache across different sessions', function () {
				it('calls the image loader to load the second image', function () {
					collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.f', sessionId: 125, focusNodeId: '125'});

					expect(imageLoader).toHaveBeenCalledWith('http://x.f');
				});
				it('positions the second image in its node', function () {
					collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.f', sessionId: 125, focusNodeId: '125'});
					loaderDeferred.resolve(secondImage);

					expect(secondImage.parent()[0]).toBe(underTest.find('#node_125')[0]);
					expect(secondImage.css('bottom')).toBe('-10px');
					expect(secondImage.css('right')).toBe('-25px');
				});
				it('leaves the first image in place', function () {
					collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.f', sessionId: 125, focusNodeId: '125'});
					loaderDeferred.resolve(secondImage);

					expect(jQueryImage.parent()[0]).toBe(underTest.find('#node_124')[0]);
					expect(jQueryImage.css('bottom')).toBe('-30px');
					expect(jQueryImage.css('right')).toBe('-40px');
				});
			});
		});
		it('drops all cached images when model is disconnected', function () {
			collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
			loaderDeferred.resolve(jQueryImage);
			collaborationModel.dispatchEvent('collaboratorFocusChanged', {photoUrl: 'http://x.f', sessionId: 125, focusNodeId: '125'});
			loaderDeferred.resolve(secondImage);

			collaborationModel.dispatchEvent('disconnected');

			expect(jQueryImage.parent().length).toBe(0);
			expect(secondImage.parent().length).toBe(0);
		});
	});
	afterEach(function () {
		underTest.remove();
	});
});
