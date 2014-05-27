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
						var sceneIndex = parseFloat(scene.storyboards[storyboardName]);
						if (sceneIndex) {
							result.push({ideaId: idea.id, title: idea.title, index: sceneIndex});
						}
					});
				}
			});
			scenesForActiveStoryboard = _.sortBy(result, 'index');
		},
		indexMatches = function (idx1, idx2) {
			return idx1 === idx2;
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
	self.insertionIndexAfter = function (indexToInsertAfter) {
		var nextIndex = 0, indexExists;
		if (!indexToInsertAfter) {
			indexToInsertAfter = 0;
			indexExists = true;
		}
		_.each(scenesForActiveStoryboard, function (scene) {
			if (indexMatches(scene.index, indexToInsertAfter)) {
				indexExists = true;
			} else if (scene.index > indexToInsertAfter && (nextIndex === 0 || scene.index < nextIndex)) {
				nextIndex = scene.index;
			}
		});
		if (!indexExists) {
			return false;
		}
		if (nextIndex) {
			return (indexToInsertAfter + nextIndex) / 2;
		} else {
			return indexToInsertAfter + 1;
		}
	};
	self.getScenes = function () {
		return scenesForActiveStoryboard;
	};
	activeContentListener.addListener(function () {

		var oldScenes = scenesForActiveStoryboard,
			getSceneDelta = function (oldScenes, newScenes) {
				var result = {removed: [], added: [], contentUpdated: []};
				_.each(oldScenes, function (oldScene) {
					var newScene  = _.findWhere(newScenes, _.omit(oldScene, 'title'));
					if (!newScene) {
						result.removed.push(oldScene);
					}
					else if (newScene.title !== oldScene.title) {
						result.contentUpdated.push(newScene);
					}
				});
				_.each(newScenes, function (newScene) {
					var oldScene  = _.findWhere(oldScenes, _.omit(newScene, 'title'));
					if (!oldScene) {
						result.added.push(newScene);
					}

				});
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

	});
};


