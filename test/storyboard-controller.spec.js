/*global describe, it, MM, expect, beforeEach, jasmine, MAPJS, observable*/
describe('Storyboards', function () {
	'use strict';
	var activeContent, mapController, activeContentListener;
	beforeEach(function () {
		activeContent = MAPJS.content({
			title: 'root',
			id: 1,
			ideas: {
				1: {id: 11, title: 'not in any storyboards'},
				2: {id: 12, title: 'already in ted storyboard', attr: {'test-scenes': [{storyboards: {'ted talk': 1}}]}},
				3: {id: 14, title: 'only in bed storyboard', attr: {'test-scenes': [{storyboards: {'ted talk': 10}}]}},
				4: {id: 13, title: 'in two storyboards', attr: {'test-scenes': [{storyboards: {'ted talk': 2, 'bed talk': 1}}]}}
			}
		});
		mapController = observable({});
		activeContentListener = new MM.ActiveContentListener(mapController);
	});
	describe('StoryboardController', function () {
		var underTest, storyboardModel;
		beforeEach(function () {
			storyboardModel = new jasmine.createSpyObj('storyboardModel', ['insertionIndexBefore', 'getActiveStoryboardName', 'updateSceneIndex', 'rebalanceAndApply', 'getScenes', 'createStoryboard', 'getScenesForNodeId', 'insertionIndexAfter', 'setScenesForNodeId', 'nextSceneIndex']);
			underTest = new MM.StoryboardController(storyboardModel);
		});
		describe('when active content is not loaded', function () {
			it('addScene should return false', function () {
				expect(underTest.addScene(1)).toBeFalsy();
			});
		});
		describe('when activeContent has been loaded', function () {
			beforeEach(function () {
				mapController.dispatchEvent('mapLoaded', 'loadedMapid', activeContent);
			});
			describe('addScene', function () {
				beforeEach(function () {
					storyboardModel.getScenesForNodeId.and.returnValue([]);
					storyboardModel.nextSceneIndex.and.returnValue(1);
				});
				describe('when no story boards exist', function () {
					beforeEach(function () {
						storyboardModel.getActiveStoryboardName.and.returnValue(undefined);
						storyboardModel.createStoryboard.and.returnValue('newname');
						underTest.addScene(12);
					});
					it('should create a default story board if no story boards exist for the map', function () {
						expect(storyboardModel.createStoryboard).toHaveBeenCalled();
					});
					it('should add a scene to an empty storyboard as the first scene', function () {
						expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(12, [{storyboards: {newname: 1}}]);
					});
				});
				describe('when the active storyboard exists but is blank', function () {
					beforeEach(function () {
						storyboardModel.getActiveStoryboardName.and.returnValue('red talk');
					});
					it('should not try to create a new storyboard', function () {
						underTest.addScene(11);
						expect(storyboardModel.createStoryboard).not.toHaveBeenCalled();
					});
					it('should add a scene to the end of a storyboard if storyboard is currently empty', function () {
						underTest.addScene(11);
						expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(11, [{storyboards: {'red talk': 1}}]);
					});
					it('should keep any other scenes for other storyboards intact', function () {
						storyboardModel.getScenesForNodeId.and.returnValue([{storyboards: {'ted talk': 1}}]);
						underTest.addScene(12);
						expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(12, [
							{storyboards: {'ted talk': 1}},
							{storyboards: {'red talk': 1}}
						]);
					});
				});
				describe('when the active storyboard exists but is not blank', function () {
					beforeEach(function () {
						storyboardModel.getActiveStoryboardName.and.returnValue('ted talk');
						storyboardModel.nextSceneIndex.and.returnValue(11);
						storyboardModel.insertionIndexAfter.and.returnValue(6);
					});
					it('should not try to create a new storyboard', function () {
						underTest.addScene(11);
						expect(storyboardModel.createStoryboard).not.toHaveBeenCalled();
					});
					it('should add a scene to the end', function () {
						underTest.addScene(11);
						expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(11, [{storyboards: {'ted talk': 11}}]);
					});
					it('should keep any other scenes for other storyboards intact', function () {
						storyboardModel.getScenesForNodeId.and.returnValue([{storyboards: {'ted talk': 1}}]);
						underTest.addScene(12);
						expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(12, [
							{storyboards: {'ted talk': 1}},
							{storyboards: {'ted talk': 11}}
						]);
					});
					describe('when the target scene is provided', function () {
						var beforeScene = {ideaId: 13, index: 2.4};
						it('should add a scene before a target scene', function () {
							storyboardModel.insertionIndexBefore.and.returnValue(2.1);
							underTest.addScene(11, beforeScene);
							expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(11, [{storyboards: {'ted talk': 2.1}}]);
							expect(storyboardModel.insertionIndexBefore).toHaveBeenCalledWith(beforeScene);
						});
						describe('when insertion index cannot be calculated', function () {
							beforeEach(function () {
								storyboardModel.insertionIndexBefore.and.returnValue(false);
								underTest.addScene(11, beforeScene);
							});
							it('does not update the index directly, rebalances instead', function () {
								expect(storyboardModel.rebalanceAndApply).toHaveBeenCalledWith([beforeScene], jasmine.any(Function));
								expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
							});
							it('invokes a callback after rebalancing to update the scene index', function () {
								var newBeforeScene = {ideaId: 13, index: 11};
								storyboardModel.insertionIndexBefore.calls.reset();
								storyboardModel.insertionIndexBefore.and.returnValue(8);
								storyboardModel.rebalanceAndApply.calls.mostRecent().args[1]([newBeforeScene]);

								expect(storyboardModel.insertionIndexBefore).toHaveBeenCalledWith(newBeforeScene);
								expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(11, [{storyboards: {'ted talk': 8}}]);
							});
						});
					});
				});
				describe('when the scene type is provided', function () {
					beforeEach(function () {
						storyboardModel.getActiveStoryboardName.and.returnValue('zed talk');
					});
					it('adds a scene by declaring the additional scene type', function () {
						underTest.addScene(11, undefined, 'with-children');
						expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(11, [{storyboards: {'zed talk': 1}, type: 'with-children'}]);
					});
				});
			});
			describe('removeScenesForIdeaId', function () {
				beforeEach(function () {
					storyboardModel.getActiveStoryboardName.and.returnValue('ted talk');
					storyboardModel.getScenesForNodeId.and.returnValue([
						{storyboards: {'ted talk': 2, 'red talk': 2}},
						{storyboards: {'ted talk': 3}},
						{storyboards: {'red talk': 3}}
					]);
				});
				it('removes all scenes for the active storyboard', function () {
					expect(underTest.removeScenesForIdeaId(12)).toBeTruthy();
					expect(storyboardModel.getScenesForNodeId).toHaveBeenCalledWith(12);
					expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(12, [
						{storyboards: {'red talk': 2}},
						{storyboards: {'red talk': 3}}
					]);
				});
				it('returns false and does nothing if there is no active storyboard', function () {
					storyboardModel.getActiveStoryboardName.and.returnValue(undefined);
					expect(underTest.removeScenesForIdeaId(12)).toBeFalsy();
					expect(storyboardModel.getScenesForNodeId).not.toHaveBeenCalled();
					expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
				});
				it('returns false and does nothing if there are no scenes for the active storyboard', function () {
					storyboardModel.getScenesForNodeId.and.returnValue([
						{storyboards: {'red talk': 2}},
						{storyboards: {'red talk': 3}}
					]);
					expect(underTest.removeScenesForIdeaId(12)).toBeFalsy();
					expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
				});
			});

			describe('moveSceneAfter', function () {
				var firstScene, middleScene, lastScene;
				beforeEach(function () {
					firstScene = {ideaId: 12, title: 'the first scene', index: 1};
					middleScene = {ideaId: 13, title: 'the middle scene', index: 2};
					lastScene = {ideaId: 14, title: 'the last scene', index: 3};
					storyboardModel.getActiveStoryboardName.and.returnValue('ted talk');
					storyboardModel.getScenes.and.returnValue([
						firstScene,
						middleScene,
						lastScene
					]);
				});
				it('should move before the first scene first if no scene to move before is supplied', function () {
					storyboardModel.insertionIndexAfter.and.returnValue(0.5);
					storyboardModel.getScenesForNodeId.and.returnValue([{storyboards: {'ted talk': 2}}]);
					expect(underTest.moveSceneAfter(middleScene)).toBeTruthy();
					expect(storyboardModel.updateSceneIndex).toHaveBeenCalledWith(middleScene, 0.5, 'ted talk');
				});
				it('should move the scene after the specified scene ', function () {
					storyboardModel.insertionIndexAfter.and.returnValue(4);
					storyboardModel.getScenesForNodeId.and.returnValue([{storyboards: {'ted talk': 2}}]);
					expect(underTest.moveSceneAfter(middleScene, lastScene)).toBeTruthy();
					expect(storyboardModel.updateSceneIndex).toHaveBeenCalledWith(middleScene, 4, 'ted talk');
				});
				describe('should do nothing and return false when scenes effectively stay in the same position because', function () {
					it('there is no active storyboard', function () {
						storyboardModel.getActiveStoryboardName.and.returnValue(undefined);
						expect(underTest.moveSceneAfter(middleScene, firstScene)).toBeFalsy();
						expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
					});
					it('the scenes to be moved is undefined', function () {
						expect(underTest.moveSceneAfter(undefined, firstScene)).toBeFalsy();
						expect(storyboardModel.getScenesForNodeId).not.toHaveBeenCalled();
						expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
					});

					it('the scenes are already in the correct order', function () {
						expect(underTest.moveSceneAfter(middleScene, firstScene)).toBeFalsy();
						expect(storyboardModel.getScenesForNodeId).not.toHaveBeenCalled();
						expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
					});
					it('the scenes is moved after itself', function () {
						expect(underTest.moveSceneAfter(middleScene, middleScene)).toBeFalsy();
						expect(storyboardModel.getScenesForNodeId).not.toHaveBeenCalled();
						expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
					});
					it('the scenes is moved first when it is already first', function () {
						expect(underTest.moveSceneAfter(firstScene)).toBeFalsy();
						expect(storyboardModel.getScenesForNodeId).not.toHaveBeenCalled();
						expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
					});
					it('the scenes to be moved does not exist in storyboard', function () {
						storyboardModel.getScenesForNodeId.and.returnValue([{storyboards: {'ted talk': 2}}]);
						expect(underTest.moveSceneAfter({ideaId: 13, title: 'the middle scene', index: 2.5}, firstScene)).toBeFalsy();
						expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
					});
				});
				describe('when insertion index cannot be calculated', function () {
					beforeEach(function () {
						storyboardModel.insertionIndexAfter.and.returnValue(false);
						storyboardModel.getScenesForNodeId.and.returnValue([{storyboards: {'ted talk': 2}}]);
						underTest.moveSceneAfter(middleScene, lastScene);
					});
					it('does not update the index directly, rebalances instead', function () {
						expect(storyboardModel.rebalanceAndApply).toHaveBeenCalledWith([middleScene, lastScene], jasmine.any(Function));
						expect(storyboardModel.updateSceneIndex).not.toHaveBeenCalled();
					});

					it('invokes a callback after rebalancing to update the scene index', function () {
						var newMiddleScene = {ideaId: 13, title: 'the middle scene', index: 11},
							newLastScene = {ideaId: 14, title: 'last', index: 33};
						storyboardModel.insertionIndexAfter.calls.reset();
						storyboardModel.insertionIndexAfter.and.returnValue(2.5);
						storyboardModel.rebalanceAndApply.calls.mostRecent().args[1]([newMiddleScene, newLastScene]);

						expect(storyboardModel.insertionIndexAfter).toHaveBeenCalledWith(newLastScene);
						expect(storyboardModel.updateSceneIndex).toHaveBeenCalledWith(newMiddleScene, 2.5, 'ted talk');
					});
				});
			});
			describe('removeScene', function () {
				beforeEach(function () {
					storyboardModel.getActiveStoryboardName.and.returnValue('ted talk');
					storyboardModel.getScenesForNodeId.and.returnValue([
						{storyboards: {'ted talk': 1, 'red talk': 1}},
						{storyboards: {'ted talk': 4}}
					]);
				});
				it('should remove only the specified scene', function () {

					underTest.removeScene({ideaId: 2, index: 1});

					expect(storyboardModel.getScenesForNodeId).toHaveBeenCalledWith(2);
					expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(2, [
						{storyboards: {'red talk': 1}},
						{storyboards: {'ted talk': 4}}
					]);
				});
				it('should clean up when the last storyboard scene is removed', function () {
					underTest.removeScene({ideaId: 2, index: 4});

					expect(storyboardModel.getScenesForNodeId).toHaveBeenCalledWith(2);
					expect(storyboardModel.setScenesForNodeId).toHaveBeenCalledWith(2, [
						{storyboards: {'ted talk': 1, 'red talk': 1}}
					]);

				});
				it('should return false if no scene to remove is supplied', function () {
					expect(underTest.removeScene()).toBeFalsy();
					expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
				});
				it('should return false if no storyboard is active', function () {
					storyboardModel.getActiveStoryboardName.and.returnValue(undefined);
					expect(underTest.removeScene({ideaId: 2, index: 1})).toBeFalsy();
					expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
				});
				it('should return false if scene to remove is nonsense', function () {
					expect(underTest.removeScene({'bleurh': '2'})).toBeFalsy();
					expect(storyboardModel.setScenesForNodeId).not.toHaveBeenCalled();
				});
			});
			describe('should reorganise the scene if the scene index precision is more than 8 significant figures', function () {
				it('when a scene is added', function () {});
				it('when a scene is moved', function () {});
				it('when a scene is inserted', function () {});
			});
			describe('when there are listeners', function () {
				describe('should reflect changes made to the map', function () {
					describe('should remove scenes related to a node when it is deleted', function () {

					});
					describe('should fire scene-added when a scene is added through active content', function () {

					});
					describe('should fire scene-removed when a scene is removed through active content', function () {

					});
					describe('should react to the active storyboard being renamed', function () {
						// also fire an event for widgets!
					});
				});
			});
			describe('when there are no listeners', function () {
				describe('should ignore changes to the map', function () {

				});
			});
			describe('should react to the loaded map being changed', function () {
				it('activates the first story board if there are any', function () {

				});
				it('removes the active storyboard if previous map had story boards and new map does not', function () {

				});
			});
		});

	});
});
