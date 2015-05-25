/*global describe, beforeEach, observable, jasmine, jQuery, afterEach, it, expect, MM, spyOn */
describe('Collaborator Photo Widget', function () {
	'use strict';
	var underTest, collaborationModel, template = '<div><div id="node_124"></div><div id="node_125"></div></div>',
			imageLoader, loaderDeferred, firstImage, secondImage;
	beforeEach(function () {
		firstImage = jQuery('<div name="firstimage">').css({width: 80, height: 60, position: 'absolute'});
		secondImage = jQuery('<div name="secondimage">').css({width:50, height:20, position: 'absolute'});
		imageLoader = jasmine.createSpy('imageLoader').and.callFake(function () {
			loaderDeferred = jQuery.Deferred();
			return loaderDeferred.promise();
		});
		collaborationModel = new MM.CollaborationModel(observable({}));
		collaborationModel.start();
		underTest = jQuery(template).appendTo('body').collaboratorPhotoWidget(collaborationModel, imageLoader, 'mm-collaborator');
	});
	describe('collaboratorFocusChanged event handling', function () {

		describe('when the collaborator image is not loaded yet', function () {
			it('loads the image using remote loader', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				expect(imageLoader).toHaveBeenCalledWith('http://x.y');
			});
			it('positions the image at the bottom right corner of the node', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(firstImage);

				expect(firstImage.parent()[0]).toBe(underTest.find('#node_124')[0]);
				expect(firstImage.css('bottom')).toBe('-30px');
				expect(firstImage.css('right')).toBe('-40px');
			});
			it('adds a tooltip showing the name of the collaborator', function () {
				spyOn(jQuery.fn, 'tooltip');
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', name: 'foobar', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(firstImage);
				expect(jQuery.fn.tooltip).toHaveBeenCalledOnJQueryObject(firstImage);
				expect(jQuery.fn.tooltip).toHaveBeenCalledWith({title: 'foobar', placement: 'bottom', container: 'body'});
			});
			it('loads but does not position if the node does not exist', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '129'});
				loaderDeferred.resolve(firstImage);

				expect(imageLoader).toHaveBeenCalledWith('http://x.y');
				expect(firstImage.parent().length).toBe(0);
			});
			it('adds the image class', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(firstImage);

				expect(firstImage.hasClass('mm-collaborator')).toBeTruthy();
			});
			it('sets the border color', function () {
				spyOn(jQuery.fn, 'css').and.callThrough();
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124', color: '#666'});
				loaderDeferred.resolve(firstImage);
				expect(jQuery.fn.css).toHaveBeenCalledOnJQueryObject(firstImage);
				expect(jQuery.fn.css).toHaveBeenCalledWith('border-color', '#666');
			});
			it('does not add adds the followed class by default', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(firstImage);

				expect(firstImage.hasClass('mm-collaborator-collowed')).toBeFalsy();
			});
		});
		describe('after the collaborator image is loaded', function () {
			beforeEach(function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(firstImage);
				imageLoader.calls.reset();
			});
			it('reuses an existing image', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '125'});

				expect(imageLoader).not.toHaveBeenCalled();
			});
//		it('does not reuse the image when the URL changes', function () { });
			it('reuses the image even if the URL changes', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.z', sessionId: 123, focusNodeId: '125'});

				expect(imageLoader).not.toHaveBeenCalled();
			});
			it('repositions image to new node', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '125'});

				expect(firstImage.parent()[0]).toBe(underTest.find('#node_125')[0]);
				expect(firstImage.css('bottom')).toBe('-30px');
				expect(firstImage.css('right')).toBe('-40px');
			});
			it('drops the image if the collaborator leaves', function () {
				collaborationModel.collaboratorPresenceChanged({sessionId: 123}, false);
				expect(firstImage.parent().length).toBe(0);
			});
			it('shows the image again if the collaborator re-appears', function () {
				collaborationModel.collaboratorPresenceChanged({sessionId: 123}, false);
				collaborationModel.collaboratorPresenceChanged({sessionId: 123, focusNodeId:'124'}, true);
				loaderDeferred.resolve(firstImage);
				expect(firstImage.parent()[0]).toBe(underTest.find('#node_124')[0]);
			});
			describe('does not cache across different sessions', function () {
				it('calls the image loader to load the second image', function () {
					collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.f', sessionId: 125, focusNodeId: '125'});

					expect(imageLoader).toHaveBeenCalledWith('http://x.f');
				});
				it('positions the second image in its node', function () {
					collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.f', sessionId: 125, focusNodeId: '125'});
					loaderDeferred.resolve(secondImage);

					expect(secondImage.parent()[0]).toBe(underTest.find('#node_125')[0]);
					expect(secondImage.css('bottom')).toBe('-10px');
					expect(secondImage.css('right')).toBe('-25px');
				});
				it('leaves the first image in place', function () {
					collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.f', sessionId: 125, focusNodeId: '125'});
					loaderDeferred.resolve(secondImage);

					expect(firstImage.parent()[0]).toBe(underTest.find('#node_124')[0]);
					expect(firstImage.css('bottom')).toBe('-30px');
					expect(firstImage.css('right')).toBe('-40px');
				});
			});
		});
	});
	it('drops all cached images when model is stopped', function () {
		collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
		loaderDeferred.resolve(firstImage);
		collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.f', sessionId: 125, focusNodeId: '125'});
		loaderDeferred.resolve(secondImage);

		collaborationModel.stop();

		expect(firstImage.parent().length).toBe(0);
		expect(secondImage.parent().length).toBe(0);
	});
	afterEach(function () {
		underTest.remove();
	});
});
