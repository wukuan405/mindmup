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
		describe('getStoryboards', function () {});
		describe('addStoryboard', function () {});
		describe('removeStoryboard', function () {});
		describe('renameStoryboard', function () {});
		describe('cloneStoryboard', function () {});
		describe('getStoryBoard', function () {});

	});


	describe('StoryboardModel', function () {
		describe('addScene', function () {});
		describe('moveAfter', function () {});
		describe('insertAfter', function () {});
		describe('remove', function () {});
		describe('setActiveStoryboardName', function () {});
		describe('getActiveStoryboardName', function () {});
		describe('activateScene', function () {});
		describe('deactivateScene', function () {});
		describe('getActiveScenes', function () {});

	});
});
