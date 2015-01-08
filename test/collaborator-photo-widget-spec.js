/*global describe, beforeEach, observable, jasmine, jQuery, afterEach, it, expect, MM, spyOn */
describe('Collaborator Photo Widget', function () {
	'use strict';
	var underTest, collaborationModel, template ='<div><div id="node_124"></div><div id="node_125"></div></div>',
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
		underTest = jQuery(template).appendTo('body').collaboratorPhotoWidget(collaborationModel, imageLoader, 'mm-collaborator', 'mm-collaborator-followed');
	});
	describe('collaboratorFocusChanged event handling', function () {

		describe('when the collaborator image is not loaded yet', function () {
			it('loads the image using remote loader', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				expect(imageLoader).toHaveBeenCalledWith('http://x.y');
			});
			it('positions the image at the bottom right corner of the node', function (){
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(firstImage);

				expect(firstImage.parent()[0]).toBe(underTest.find('#node_124')[0]);
				expect(firstImage.css('bottom')).toBe('-30px');
				expect(firstImage.css('right')).toBe('-40px');
			});
			it('loads but does not position if the node does not exist', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '129'});
				loaderDeferred.resolve(firstImage);

				expect(imageLoader).toHaveBeenCalledWith('http://x.y');
				expect(firstImage.parent().length).toBe(0);
			});
//		it('positions the image if the node does not exist but appears later', function () { });
			it('sets up a tap event on the image to toggle following by session id', function () {
				spyOn(collaborationModel, 'toggleFollow');
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(firstImage);
				firstImage.trigger('tap');

				expect(collaborationModel.toggleFollow).toHaveBeenCalledWith('123');
			});
			it('adds the image class', function () {
				collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: 123, focusNodeId: '124'});
				loaderDeferred.resolve(firstImage);

				expect(firstImage.hasClass('mm-collaborator')).toBeTruthy();
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
	describe('followedCollaboratorChanged event handling', function () {
		var session1, session2;
		beforeEach(function () {
			session1 = 555;
			session2 = 777;
			collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.y', sessionId: session1, focusNodeId: '124'});
			loaderDeferred.resolve(firstImage);

			collaborationModel.collaboratorFocusChanged({photoUrl: 'http://x.f', sessionId: session2, focusNodeId: '125'});
			loaderDeferred.resolve(secondImage);

			secondImage.addClass('mm-collaborator-followed');
		});
		it('assigns the followed css class to the new followed collaborator', function () {
			collaborationModel.toggleFollow(session1);
			expect(firstImage.hasClass('mm-collaborator-followed')).toBeTruthy();
		});
		it('removes the followed collaborator css class from any previous cached images', function () {
			collaborationModel.toggleFollow(session1);
			expect(secondImage.hasClass('mm-collaborator-followed')).toBeFalsy();
		});
		it('removes the followed css class from all collaborators if the argument is undefined', function () {
			collaborationModel.toggleFollow(session1);
			collaborationModel.toggleFollow(session1);
			expect(firstImage.hasClass('mm-collaborator-followed')).toBeFalsy();
			expect(secondImage.hasClass('mm-collaborator-followed')).toBeFalsy();
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
