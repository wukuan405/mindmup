/*global MM, observable, _ */
MM.StoryboardModel = function (activeContentListener, storyboardAttrName, sceneAttrName) {
	'use strict';
	var self = observable(this),
		isInputEnabled,
		scenesForActiveStoryboard,
		rebuildScenesForActiveStoryboard = function () {
			var storyboardName = self.getActiveStoryboardName(),
				result = [];
			if (!storyboardName) {
				scenesForActiveStoryboard = result;
				return;
			}
			activeContentListener.getActiveContent().traverse(function (idea) {
				var scenes = idea.getAttr(sceneAttrName);
				if (scenes) {
					_.each(scenes, function (scene) {
						var sceneIndex = parseFloat(scene.storyboards[storyboardName]), converted, icon;
						if (sceneIndex) {
							converted = {ideaId: idea.id, title: idea.title, index: sceneIndex};
							icon = idea.getAttr('icon');
							if (icon) {
								converted.image = icon;
							}
							result.push(converted);
						}
					});
				}
			});
			scenesForActiveStoryboard = _.sortBy(result, 'index');
		},
		indexMatches = function (idx1, idx2) {
			return Math.abs(idx1 - idx2) < 0.0001;
		},
		findMaxIndex = function (arr) {
			if (!arr) {
				return 0;
			}
			var maxIndex = arr.length;
			_.each(arr, function (boardName) {
				var match = boardName.match(/^Storyboard ([1-9]+)/),
					idx = (match && match.length > 1 && parseFloat(match[1])) || 0;
				if (idx > maxIndex) {
					maxIndex = idx;
				}
			});
			return maxIndex;
		};
	self.setInputEnabled = function (isEnabled) {
		isInputEnabled = isEnabled;
		self.dispatchEvent('inputEnabled', isEnabled);
	};
	self.getInputEnabled = function () {
		return isInputEnabled;
	};
	self.getActiveStoryboardName = function () {
		var content = activeContentListener && activeContentListener.getActiveContent(),
			list = content && content.getAttr(storyboardAttrName);
		if (list && list.length > 0) {
			return list[0];
		}
	};
	self.createStoryboard = function () {
		var content = activeContentListener && activeContentListener.getActiveContent(),
			boards = (content && content.getAttr(storyboardAttrName)) || [],
			maxIndex = findMaxIndex(boards),
			name = 'Storyboard ' + (maxIndex + 1);
		if (!content) {
			return;
		}
		boards.push(name);
		content.updateAttr(content.id, storyboardAttrName, boards);
		return name;
	};
	self.nextSceneIndex = function () {
		var lastScene = _.last(scenesForActiveStoryboard);
		if (!lastScene) {
			return 1;
		}
		return lastScene.index + 1;
	};
	self.getScenesForNodeId = function (nodeId) {
		var scenes = activeContentListener.getActiveContent().getAttrById(nodeId, sceneAttrName) || [];
		return JSON.parse(JSON.stringify(scenes));
	};
	self.setScenesForNodeId = function (nodeId, scenes) {
		activeContentListener.getActiveContent().updateAttr(nodeId, sceneAttrName, scenes);
	};
	self.insertionIndexAfter = function (sceneToInsertAfter) {
		var sceneToInsertAfterPosition,
			nextIndex,
			result,
			indexToInsertAtStart = function () {
				var result;
				if (scenesForActiveStoryboard.length === 0) {
					return false;
				} else {
					result = scenesForActiveStoryboard[0].index / 2;
					if (indexMatches(result, scenesForActiveStoryboard[0].index)) {
						return false; /* rebalance required */
					} else {
						return result;
					}
				}
			};
		if (!sceneToInsertAfter) {
			return indexToInsertAtStart();
		}
		sceneToInsertAfterPosition = _.indexOf(scenesForActiveStoryboard, _.find(scenesForActiveStoryboard, function (scene) { return scene.ideaId === sceneToInsertAfter.ideaId && scene.index === sceneToInsertAfter.index; }));
		if (sceneToInsertAfterPosition < 0) {
			return false;
		}
		if (sceneToInsertAfterPosition === scenesForActiveStoryboard.length - 1) {
			return sceneToInsertAfter.index + 1;
		}
		nextIndex = scenesForActiveStoryboard[sceneToInsertAfterPosition + 1].index;
		result = (sceneToInsertAfter.index + nextIndex) / 2;
		if (indexMatches(result, nextIndex) || indexMatches(result, sceneToInsertAfter.index)) {
			return false;
		}
		return result;
	};
	self.getScenes = function () {
		return scenesForActiveStoryboard;
	};
	activeContentListener.addListener(function () {

		var oldScenes = scenesForActiveStoryboard,
			getSceneDelta = function (oldScenes, newScenes) {
				var result = {removed: [], added: [], contentUpdated: []};
				_.each(oldScenes, function (oldScene) {
					var newScene  = _.findWhere(newScenes, _.omit(oldScene, 'title', 'image'));
					if (!newScene) {
						result.removed.push(oldScene);
					}
					else if (newScene.title !== oldScene.title || ! _.isEqual(newScene.image, oldScene.image)) {
						result.contentUpdated.push(newScene);
					}
				});
				_.each(newScenes, function (newScene) {
					var oldScene  = _.findWhere(oldScenes, _.omit(newScene, 'title', 'image'));
					if (!oldScene) {
						result.added.push(newScene);
					}

				});
				if (result.added.length === 1 && result.removed.length === 1 && result.contentUpdated.length === 0 &&
						_.isEqual(_.omit(result.added[0], 'index'), _.omit(result.removed[0], 'index'))) {
					return { moved: {from: result.removed[0], to: result.added[0]} };
				}
				return result;
			},
			delta;
		rebuildScenesForActiveStoryboard();
		delta = getSceneDelta(oldScenes, scenesForActiveStoryboard);

		_.each(delta.removed, function (scene) {
			self.dispatchEvent('storyboardSceneRemoved', scene);
		});
		_.each(delta.added, function (scene) {
			self.dispatchEvent('storyboardSceneAdded', scene);
		});
		_.each(delta.contentUpdated, function (scene) {
			self.dispatchEvent('storyboardSceneContentUpdated', scene);
		});
		if (delta.moved) {
			self.dispatchEvent('storyboardSceneMoved', delta.moved);
		}
	});
};


