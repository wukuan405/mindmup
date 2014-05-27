/*global MM, observable, _ */
MM.StoryboardModel = function (activeContentListener, storyboardAttrName, sceneAttrName) {
	'use strict';
	var self = observable(this),
		activeBoardName,
		isInputEnabled,
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
			if (list.indexOf(activeBoardName) >= 0) {
				return activeBoardName;
			}
			else {
				return list[0];
			}
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
		self.setActiveStoryboardName(name);
		return name;
	};
	self.setActiveStoryboardName = function (name) {
		activeBoardName = name;
	};
	self.nextSceneIndex = function () {
		var storyboardName = self.getActiveStoryboardName(),
			index = 0;
		if (!storyboardName) {
			return 1;
		}
		activeContentListener.getActiveContent().traverse(function (idea) {
			var scenes = idea.getAttr(sceneAttrName);
			if (scenes) {
				_.each(scenes, function (scene) {
					var sceneIndex = parseFloat(scene.storyboards[storyboardName]);
					if (sceneIndex && sceneIndex > index) {
						index = sceneIndex;
					}
				});
			}
		});
		return index + 1;
	};
	self.getScenesForNodeId = function (nodeId) {
		var scenes = activeContentListener.getActiveContent().getAttrById(nodeId, sceneAttrName) || [];
		return JSON.parse(JSON.stringify(scenes));
	};
	self.setScenesForNodeId = function (nodeId, scenes) {
		activeContentListener.getActiveContent().updateAttr(nodeId, sceneAttrName, scenes);
	};
	self.insertionIndexAfter = function (indexToInsertAfter) {
		var storyboardName = self.getActiveStoryboardName(),
			nextIndex = 0, indexExists;
		if (!storyboardName) {
			return false;
		}
		if (!indexToInsertAfter) {
			indexToInsertAfter = 0;
			indexExists = true;
		}
		activeContentListener.getActiveContent().traverse(function (idea) {
			var scenes = idea.getAttr(sceneAttrName);
			if (scenes) {
				_.each(scenes, function (scene) {
					var sceneIndex = parseFloat(scene.storyboards[storyboardName]);
					if (indexMatches(sceneIndex, indexToInsertAfter)) {
						indexExists = true;
					} else if (sceneIndex && sceneIndex > indexToInsertAfter && (nextIndex === 0 || sceneIndex < nextIndex)) {
						nextIndex = sceneIndex;
					}
				});
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
		var storyboardName = self.getActiveStoryboardName(),
			result = [];
		if (!storyboardName) {
			return result;
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
		return _.sortBy(result, 'index');
	};
	activeContentListener.addListener(function () {
		self.dispatchEvent('storyboardRebuilt');
	});
};


