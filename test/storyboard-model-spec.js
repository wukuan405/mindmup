/*global describe, it, MM, expect, beforeEach, jasmine, MAPJS, observable, spyOn, _*/
describe('MM.Storyboard.scene', function () {
	'use strict';
	it('should return mixin of same object', function () {
		var base = {ideaId: 12, title: 'a', index: 1};
		expect(MM.Storyboard.scene(base)).toBe(base);
	});
	it('should return undefined if applied ot undefined', function () {
		expect(MM.Storyboard.scene(undefined)).toBeUndefined();
	});
	describe('matchesScene', function () {
		var underTest;
		beforeEach(function () {
			underTest = MM.Storyboard.scene({ideaId: 12, title: 'a', index: 1});
		});
		it('should match same scene', function () {
			expect(underTest.matchesScene({ideaId: 12, title: 'a', index: 1})).toBeTruthy();
		});
		it('should match same scene if ideaId is a string', function () {
			expect(underTest.matchesScene({ideaId: '12', title: 'a', index: 1})).toBeTruthy();
		});
		it('should match same scene ignoring title has changed', function () {
			expect(underTest.matchesScene({ideaId: 12, title: 'b', index: 1})).toBeTruthy();
		});
		it('should not match scene with different index', function () {
			expect(underTest.matchesScene({ideaId: 12, title: 'a', index: 1.1})).toBeFalsy();
		});
		it('should not match scene with different ideaId', function () {
			expect(underTest.matchesScene({ideaId: 13, title: 'a', index: 1})).toBeFalsy();
		});
		it('should not match undefined with different ideaId', function () {
			expect(underTest.matchesScene({ideaId: 13, title: 'a', index: 1})).toBeFalsy();
		});
	});
	describe('clone', function () {
		it('should return a clone of the scene', function () {
			var base = {ideaId: 12, title: 'a', index: 1, type: 'xxx'},
					scene = MM.Storyboard.scene(base),
					clone = scene.clone();
			base.ideaId = 13;
			base.title = 'b';
			base.index = 2;
			base.type = 'zzz';

			expect(scene.ideaId).toBe(13);
			expect(clone.ideaId).toBe(12);
			expect(scene.title).toBe('b');
			expect(clone.title).toBe('a');
			expect(scene.index).toBe(2);
			expect(clone.index).toBe(1);
			expect(scene.type).toBe('zzz');
			expect(clone.type).toBe('xxx');
			expect(clone.clone).not.toBeUndefined();
			expect(clone.matchesScene).not.toBeUndefined();
		});
	});
});
describe('MM.Storyboard.sceneList', function () {
	'use strict';
	var underTest;
	beforeEach(function () {
		underTest = MM.Storyboard.sceneList([
			{ideaId: 12, title: 'a', index: 1},
			{ideaId: 12, title: 'a', index: 2},
			undefined,
			{ideaId: 13, title: 'a', index: 3},
			{ideaId: 13, title: 'a', index: 3}
		]);
	});
	describe('findScene', function () {
		it('should find a scene matching by ideaId and index', function () {
			var toFind = {ideaId: 12, title: 'b', index: 2},
					found = underTest.findScene(toFind);
			expect(found).toBe(underTest[1]);
			expect(found).not.toBe(toFind);
		});
		it('should return undefined if no scene is found', function () {
			expect(underTest.findScene({ideaId: 12, title: 'a', index: 3})).toBeUndefined();
		});
		it('should return undefined if passed an undefined', function () {
			expect(underTest.findScene(undefined)).toBeUndefined();
		});
		it('should return the first matching scene found', function () {
			var toFind = {ideaId: 13, title: 'a', index: 3},
					found = underTest.findScene(toFind);
			expect(found).toBe(underTest[3]);
			expect(found).not.toBe(underTest[4]);
		});
	});
	describe('indexOfScene', function () {
		it('should return index of matching scene', function () {
			expect(underTest.indexOfScene({ideaId: 12, title: 'b', index: 2})).toBe(1);
		});
		it('should return -1 if no scene is found', function () {
			expect(underTest.indexOfScene({ideaId: 12, title: 'a', index: 3})).toBe(-1);
		});
		it('should return -1 if passed an undefined', function () {
			expect(underTest.indexOfScene(undefined)).toBe(-1);
		});
		it('should return the index of first matching scene found', function () {
			expect(underTest.indexOfScene({ideaId: 13, title: 'a', index: 3})).toBe(3);
		});
	});
	describe('nextSceneIndex', function () {
		it('returns 1 for empty list', function () {
			expect(MM.Storyboard.sceneList([]).nextSceneIndex()).toBe(1);
		});
		it('returns max index + 1 for non empty storyboards', function () {
			expect(underTest.nextSceneIndex()).toBe(4);
		});
	});

});
describe('Storyboards', function () {
	'use strict';
	var activeContent, mapController, activeContentListener;
	beforeEach(function () {
		activeContent = MAPJS.content({
			title: 'root',
			id: 1,
			attr: {
				'test-storyboards': ['ted talk']
			},
			ideas: {
				1: {id: 11, title: 'not in any storyboards'},
				2: {id: 12, title: 'already in ted storyboard', attr: {'test-scenes': [{storyboards: {'ted talk': 1}}]}},
				3: {id: 14, title: 'is in two scenes', attr: {'test-scenes': [{storyboards: {'ted talk': 9}}, {storyboards: {'ted talk': 10}}]}},
				4: {id: 13, title: 'scene with icon', attr: {icon: {url: 'http://fakeurl', width: 100, height: 200, position: 'left'}, 'test-scenes': [{storyboards: {'ted talk': 2}}]}}
			}
		});
		mapController = observable({});
		activeContentListener = new MM.ActiveContentListener(mapController);
	});

	describe('StoryboardModel', function () {
		var underTest,
				sceneMatcher = function (scene) {
					scene.clone = jasmine.any(Function);
					scene.matchesScene = jasmine.any(Function);
					return scene;
				},
				toRawScene = function (scene) {
					if (!scene) {
						return undefined;
					}
					return _.extend({}, _.omit(scene, ['matchesScene', 'clone']));
				},
				toRawList = function (sceneList) {
					return _.map(sceneList, function (scene) {
						return toRawScene(scene);
					});
				};
		beforeEach(function () {
			underTest = new MM.StoryboardModel(activeContentListener, 'test-storyboards', 'test-scenes');
			mapController.dispatchEvent('mapLoaded', 'loadedMapid', activeContent);
		});
		describe('getActiveStoryboardName', function () {
			it('should return undefined if no storyboards are defined', function () {
				activeContent.updateAttr(1, 'test-storyboards', undefined);
				expect(underTest.getActiveStoryboardName()).toBeUndefined();
			});
			it('should return the first storyboard name by default', function () {
				expect(underTest.getActiveStoryboardName()).toEqual('ted talk');
			});
		});
		describe('setInputEnabled', function () {
			var listener = jasmine.createSpy('listener');
			beforeEach(function () {
				underTest.addEventListener('inputEnabled', listener);
			});
			it('should dispatch an InputEnabled event when true', function () {
				underTest.setInputEnabled(true);
				expect(listener).toHaveBeenCalledWith(true);
			});
			it('should dispatch an InputEnabled event when false', function () {
				underTest.setInputEnabled(false);
				expect(listener).toHaveBeenCalledWith(false);
			});
		});
		describe('getIsInputEnabled', function () {
			it('should be false to begin with', function () {
				expect(underTest.getInputEnabled()).toBeFalsy();
			});
			it('should be true when set', function () {
				underTest.setInputEnabled(true);
				expect(underTest.getInputEnabled()).toBe(true);
			});
		});
		describe('rebalance', function () {
			it('reinitialises indexes for the active storyboard based on array positions', function () {
				underTest.rebalance();
				expect(toRawList(underTest.getScenes())).toEqual([
					{ideaId: 12, title: 'already in ted storyboard', index: 1},
					{ideaId: 13, title: 'scene with icon', index: 2, image: {url: 'http://fakeurl', width: 100, height: 200, position: 'left'}},
					{ideaId: 14, title: 'is in two scenes', index: 3},
					{ideaId: 14, title: 'is in two scenes', index: 4}
				]);
			});
			it('returns scenes with new indexes for any supplied arguments', function () {
				var result = underTest.rebalance([
					{ideaId: 12, title: 'already in ted storyboard', index: 1},
					{ideaId: 12, title: 'some unknown scene', index: 55},
					undefined,
					{ideaId: 14, title: 'is in two scenes', index: 10}
				]);
				expect(toRawList(result)).toEqual([
					{ideaId: 12, title: 'already in ted storyboard', index: 1},
					undefined,
					undefined,
					{ideaId: 14, title: 'is in two scenes', index: 4}
				]);
			});
		});
		describe('rebalanceAndApply', function () {
			var applySpy,
					interestingScenes;
			beforeEach(function () {
				applySpy = jasmine.createSpy('applied');
				interestingScenes = [
					{ideaId: 12, title: 'already in ted storyboard', index: 1},
					{ideaId: 14, title: 'is in two scenes', index: 10}
				];
			});
			it('starts a batch in active content', function () {
				spyOn(activeContent, 'startBatch').and.callThrough();
				underTest.rebalanceAndApply(interestingScenes, applySpy);
				expect(activeContent.startBatch).toHaveBeenCalled();
			});
			it('rebalances the active storyboard', function () {
				spyOn(underTest, 'rebalance').and.callThrough();
				underTest.rebalanceAndApply(interestingScenes, applySpy);
				expect(underTest.rebalance).toHaveBeenCalledWith(interestingScenes);
			});
			it('applies the supplied function', function () {
				underTest.rebalanceAndApply(interestingScenes, applySpy);
				expect(applySpy).toHaveBeenCalledWith([
					{ideaId: 12, title: 'already in ted storyboard', index: 1},
					{ideaId: 14, title: 'is in two scenes', index: 4}
				]);
			});
			it('completes the batch', function () {
				spyOn(activeContent, 'endBatch').and.callThrough();
				underTest.rebalanceAndApply(interestingScenes, applySpy);
				expect(activeContent.endBatch).toHaveBeenCalled();
			});
		});
		describe('createStoryboard', function () {
			it('should add the new storyboard name to the list of storyboards', function () {
				activeContent.updateAttr(1, 'test-storyboards', undefined);
				underTest.createStoryboard();
				expect(activeContent.getAttrById(1, 'test-storyboards')).toEqual(['Storyboard 1']);
			});
			it('should return the new storyboard name', function () {
				activeContent.updateAttr(1, 'test-storyboards', undefined);
				expect(underTest.createStoryboard()).toEqual('Storyboard 1');
			});
			it('should name the new storyboard Story Board X, incrementing the counter', function () {
				activeContent.updateAttr(1, 'test-storyboards', ['mickey mouse', 'donald duck']);
				var first = underTest.createStoryboard(),
					second = underTest.createStoryboard();
				expect(first).toBe('Storyboard 3');
				expect(second).toBe('Storyboard 4');
			});
			it('should skip over any counters in the same format as autogenerated, to avoid conflicts', function () {
				activeContent.updateAttr(1, 'test-storyboards', ['Storyboard 5', 'donald duck']);
				expect(underTest.createStoryboard()).toBe('Storyboard 6');
			});
		});
		describe('nextSceneIndex', function () {
			it('returns 1 for non existent storyboards', function () {
				activeContent.updateAttr(1, 'test-storyboards', undefined);
				expect(underTest.nextSceneIndex()).toBe(1);
			});
			it('returns max index + 1 for non empty storyboards', function () {
				expect(underTest.nextSceneIndex()).toBe(11);
			});
		});
		describe('getScenesForNodeId', function () {
			it('retrieves the value of the scenes attr', function () {
				expect(underTest.getScenesForNodeId(11)).toEqual([]);
				expect(underTest.getScenesForNodeId(12)).toEqual([{storyboards: {'ted talk': 1}}]);
				expect(underTest.getScenesForNodeId(13)).toEqual([{storyboards: {'ted talk': 2}}]);
			});
		});
		describe('setScenesForNodeId', function () {
			it('sets the value of the scenes attr', function () {
				underTest.setScenesForNodeId(12, [{storyboards: {'xed talk': 5}}]);
				expect(activeContent.getAttrById(12, 'test-scenes')).toEqual([{storyboards: {'xed talk': 5}}]);
			});
		});
		describe('index calculation', function () {
			var firstScene, secondScene, thirdScene, lastScene;
			beforeEach(function () {
				firstScene = {index: 1, ideaId: 12, title: 'already in ted storyboard'};
				secondScene = {index: 2, ideaId: 13, title: 'scene with icon'};
				thirdScene = {index: 9, ideaId: 14, title: 'is in two scenes'};
				lastScene = {index: 10, ideaId: 14, title: 'is in two scenes'};
			});
			describe('insertionIndexAfter', function () {
				it('should return false if there is no active storyboard', function () {
					activeContent.updateAttr(1, 'test-storyboards', undefined);
					expect(underTest.insertionIndexAfter()).toBeFalsy();
				});
				it('should return false if the active storyboard is empty', function () {
					activeContent.updateAttr(1, 'test-storyboards', ['xed talk']);
					expect(underTest.insertionIndexAfter()).toBeFalsy();
				});
				it('calculates the arithmetic median between 0 and the first item if the scene argument is not provided', function () {
					expect(underTest.insertionIndexAfter()).toBe(0.5);
				});
				it('calculates the arithmetic median if the provided scene is not the last in the list', function () {
					expect(underTest.insertionIndexAfter(firstScene)).toBe(1.5);
					expect(underTest.insertionIndexAfter(secondScene)).toBe(5.5);
				});

				it('adds 1 to the max index if the argument is the last in the list', function () {
					expect(underTest.insertionIndexAfter(lastScene)).toBe(11);
				});
				it('returns false if the scene is not in the list', function () {
					expect(underTest.insertionIndexAfter({index: 1, ideaId: 13})).toBeFalsy();
				});
				it('returns false if the arg is not provided and first scene is too close to 0', function () {
					underTest.updateSceneIndex(firstScene, 0.0001, 'ted talk');
					expect(underTest.insertionIndexAfter()).toBeFalsy();
				});
				it('returns false if the argument is too close to the next scene in the list', function () {
					var moved = underTest.updateSceneIndex(firstScene, 1.9999, 'ted talk');
					expect(underTest.insertionIndexAfter(moved)).toBeFalsy();
				});
			});
			describe('insertionIndexBefore', function () {
				it('should return false if there is no active storyboard', function () {
					activeContent.updateAttr(1, 'test-storyboards', undefined);
					expect(underTest.insertionIndexBefore()).toBeFalsy();
				});
				it('should return false if the active storyboard is empty', function () {
					activeContent.updateAttr(1, 'test-storyboards', ['xed talk']);
					expect(underTest.insertionIndexBefore()).toBeFalsy();
				});
				it('returns false if the argument is not provided', function () {
					expect(underTest.insertionIndexBefore()).toBeFalsy();
				});
				it('calculates the arithmetic median if the provided scene is not the first in the list', function () {
					expect(underTest.insertionIndexBefore(thirdScene)).toBe(5.5);
					expect(underTest.insertionIndexBefore(secondScene)).toBe(1.5);
				});

				it('calculates the arithmetic median between 0 and scene index if it the argument is the first scene in the list', function () {
					expect(underTest.insertionIndexBefore(firstScene)).toBe(0.5);
				});
				it('returns false if the scene is not in the list', function () {
					expect(underTest.insertionIndexBefore({index: 1, ideaId: 13})).toBeFalsy();
				});
				it('returns false if the scene before is too close to 0', function () {
					var moved = underTest.updateSceneIndex(firstScene, 0.0001, 'ted talk');
					expect(underTest.insertionIndexBefore(moved)).toBeFalsy();
				});
				it('returns false if the scene before is too close to the previous scene in the list', function () {
					var moved = underTest.updateSceneIndex(secondScene, 1.00001, 'ted talk');
					expect(underTest.insertionIndexBefore(moved)).toBeFalsy();
				});
			});
		});
		describe('getScenes', function () {
			it('retrieves a list of scenes', function () {
				expect(underTest.getScenes()).toEqual([
					{ideaId: 12, title: 'already in ted storyboard', index: 1},
					{ideaId: 13, title: 'scene with icon', index: 2, image: {url: 'http://fakeurl', width: 100, height: 200, position: 'left'}},
					{ideaId: 14, title: 'is in two scenes', index: 9},
					{ideaId: 14, title: 'is in two scenes', index: 10}
				]);
			});
			it('clones image object disconnecting it from the original', function () {
				underTest.getScenes()[1].image.url = 'http://changed';
				expect(activeContent.getAttrById(13, 'icon').url).toEqual('http://fakeurl');
			});
			it('should return an empty array if there are no storyboards', function () {
				activeContent.updateAttr(1, 'test-storyboards', undefined);
				expect(underTest.getScenes()).toEqual([]);
			});
			it('generates a title using a list of children for with-children nodes', function () {
				activeContent.addSubIdea(12, 'first child');
				activeContent.addSubIdea(12, 'second child');
				activeContent.addSubIdea(12, 'third child');
				activeContent.updateAttr(12, 'test-scenes', [{storyboards: {'ted talk': 1}, type: 'with-children'}]);
				expect(underTest.getScenes()[0].title).toEqual('already in ted storyboard\n- first child\n- second child\n- third child');
			});
		});
		describe('should dispatch events when the storyboard changes', function () {
			var storyboardSceneAddedListener,
				storyboardSceneRemovedListener,
				storyboardSceneContentUpdatedListener,
				storyboardSceneMovedListener;
			beforeEach(function () {
				storyboardSceneAddedListener = jasmine.createSpy('storyboardSceneAddedListener');
				underTest.addEventListener('storyboardSceneAdded', storyboardSceneAddedListener);

				storyboardSceneRemovedListener = jasmine.createSpy('storyboardSceneRemovedListener');
				underTest.addEventListener('storyboardSceneRemoved', storyboardSceneRemovedListener);

				storyboardSceneMovedListener = jasmine.createSpy('storyboardSceneMovedListener');
				underTest.addEventListener('storyboardSceneMoved', storyboardSceneMovedListener);

				storyboardSceneContentUpdatedListener = jasmine.createSpy('storyboardSceneContentUpdatedListener');
				underTest.addEventListener('storyboardSceneContentUpdated', storyboardSceneContentUpdatedListener);

			});
			it('should dispatch a storyboardSceneAdded events when scenes are added', function () {
				activeContent.updateAttr(11, 'test-scenes', [{storyboards: {'ted talk': 5.5}}, {storyboards: {'ted talk': 6.5}}]);

				expect(storyboardSceneAddedListener).toHaveBeenCalledWith(sceneMatcher({ideaId: 11, title: 'not in any storyboards', index: 5.5}));
				expect(storyboardSceneAddedListener).toHaveBeenCalledWith(sceneMatcher({ideaId: 11, title: 'not in any storyboards', index: 6.5}));

				expect(storyboardSceneAddedListener.calls.count()).toBe(2);
				expect(storyboardSceneRemovedListener).not.toHaveBeenCalled();
				expect(storyboardSceneContentUpdatedListener).not.toHaveBeenCalled();
			});
			it('should dispatch a storyboardSceneRemoved events when scenes are removed', function () {
				activeContent.updateAttr(14, 'test-scenes', undefined);

				expect(storyboardSceneRemovedListener).toHaveBeenCalledWith(sceneMatcher({ideaId: 14, title: 'is in two scenes', index: 9}));
				expect(storyboardSceneRemovedListener).toHaveBeenCalledWith(sceneMatcher({ideaId: 14, title: 'is in two scenes', index: 10}));

				expect(storyboardSceneRemovedListener.calls.count()).toBe(2);
				expect(storyboardSceneAddedListener).not.toHaveBeenCalled();
				expect(storyboardSceneContentUpdatedListener).not.toHaveBeenCalled();
			});

			it('should dispatch a storyboardSceneRemoved events when ideas are removed', function () {
				activeContent.removeSubIdea(14);

				expect(storyboardSceneRemovedListener).toHaveBeenCalledWith(sceneMatcher({ideaId: 14, title: 'is in two scenes', index: 9}));
				expect(storyboardSceneRemovedListener).toHaveBeenCalledWith(sceneMatcher({ideaId: 14, title: 'is in two scenes', index: 10}));

				expect(storyboardSceneRemovedListener.calls.count()).toBe(2);
				expect(storyboardSceneAddedListener).not.toHaveBeenCalled();
				expect(storyboardSceneContentUpdatedListener).not.toHaveBeenCalled();

			});
			it('should dispatch a storyboardSceneContentUpdated events when scenes titles are changed', function () {
				activeContent.updateTitle(14, 'booyah');

				expect(storyboardSceneContentUpdatedListener).toHaveBeenCalledWith(sceneMatcher({ideaId: 14, title: 'booyah', index: 9}));
				expect(storyboardSceneContentUpdatedListener).toHaveBeenCalledWith(sceneMatcher({ideaId: 14, title: 'booyah', index: 10}));

				expect(storyboardSceneContentUpdatedListener.calls.count()).toBe(2);
				expect(storyboardSceneAddedListener).not.toHaveBeenCalled();
				expect(storyboardSceneRemovedListener).not.toHaveBeenCalled();
			});
			it('should dispatch a storyboardSceneContentUpdated events when image changes', function () {
				activeContent.mergeAttrProperty(13, 'icon', 'width', 200);

				expect(storyboardSceneContentUpdatedListener).toHaveBeenCalledWith(
					sceneMatcher({ideaId: 13, title: 'scene with icon', index: 2, image: {url: 'http://fakeurl', width: 200, height: 200, position: 'left'}})
				);

				expect(storyboardSceneContentUpdatedListener.calls.count()).toBe(1);
				expect(storyboardSceneAddedListener).not.toHaveBeenCalled();
				expect(storyboardSceneRemovedListener).not.toHaveBeenCalled();
			});
			it('should dispatch storyboardSceneMoved only when a scene index is changed', function () {
				activeContent.updateAttr(14, 'test-scenes', [{storyboards: {'ted talk': 7}}, {storyboards: {'ted talk': 10}}]);

				expect(storyboardSceneMovedListener).toHaveBeenCalledWith({
					from: sceneMatcher({ideaId: 14, title: 'is in two scenes', index: 9}),
					to: sceneMatcher({ideaId: 14, title: 'is in two scenes', index: 7})
				});

				expect(storyboardSceneAddedListener).not.toHaveBeenCalled();
				expect(storyboardSceneRemovedListener).not.toHaveBeenCalled();
				expect(storyboardSceneContentUpdatedListener).not.toHaveBeenCalled();
			});
		});
	});

});
