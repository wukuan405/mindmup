/*global describe, it, MM, expect*/
describe('Storyboards', function () {
	'use strict';
	describe('buildStoryboardScene', function () {
		it('should return a scene object with nodeId and index', function () {
			var scene = MM.buildStoryboardScene(12, 1.25);
			expect(scene).toEqual({nodeId: 12, index: 1.25});
		});
	});

	describe('StoryboardRepository', function () {
		describe('getStoryboards', function () {
			it('should return a list of storyboard names', function () {});
		});
		describe('addStoryboard', function () {
			it('should add the new storyboard name to the list of storyboards', function () {});
		});
		describe('removeStoryboard', function () {
			it('should remove the new storyboard from the list of storyboards', function () {});
			it('should remove clean all nodes that were scenes in a storyboard', function () {});

		});
		describe('renameStoryboard', function () {
			it('should change the storyboard name in the list of storyboards', function () {});
		});
		describe('cloneStoryboard', function () {
			it('should create a storyboard with a the same scenes as the cloned storyboard', function () {
			});
		});
		describe('getStoryBoard', function () {
			it('should return a storyboard matching the supplied name', function () {
				/*
				It is still not clear what a "storyboard" is
				- a list of scenes?
				- a map (containing a list of scenes)?
				- an object that encapsulates behaviour?
				*/
			});
		});
		describe('when a new map is loaded', function () {

		});
	});


	describe('StoryboardModel', function () {
		describe('addScene', function () {
			it('should add a scene to the active storyboard after the last activated node', function () {});
		});
		describe('moveAfter', function () {
			it('should move the activated scenes scene after the specified scene ', function () {});
		});
		describe('insertAfter', function () {
			it('should intert the scene after the specified scene', function () {

			});
		});
		describe('remove', function () {
			it('should remove all activated scenes', function () {

			});
		});
		describe('setActiveStoryboardName', function () {
			it('should change the active storyboard', function () {

			});
			it('should activate the last scene by default', function () {

			});
		});
		describe('getActiveStoryboardName', function () {
			it('should return the activated storyboard name', function () {

			});
			it('should return the first storyboard name by default', function () {

			});
		});
		describe('activateScene', function () {
			it('should add the scene to the list of activated scenes if deactivateOthers is not specified', function () {

			});
			it('should add the scene to the list of activated scenes if deactivateOthers is false', function () {
			});
			it('should deactivate all activated scenes and activate the specified scene if deactivateOthers is true', function () {

			});
		});
		describe('deactivateScene', function () {
			it('should deactivate the scpecified scene', function () {

			});

		});
		describe('getActiveScenes', function () {
			it('should return all activated scenes', function () {

			});
			it('should return the last scene if no scene is active', function () {
				/*
				I'm not really sure about this behaviour,
				can there be a situation where no scenes are activated?
				*/
			});
		});
		describe('should reorganise the scene if the scene index precision is more than 8 significant figures', function () {
			it('when a scene is added', function () {});
			it('when a scene is moved', function () {});
			it('when a scene is inserted', function () {});
		});
		describe('should reflect changes made to the map', function () {
			describe('should remove scenes related to a node when it is deleted', function () {

			});

		});
		describe('should react to the loaded map being changed', function () {

		});
	});
});
