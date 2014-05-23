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
	self.nextSceneIndex = function (storyboardName) {
		var index = 0;
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
	self.insertionIndexAfter = function (storyboardName, indexToInsertAfter) {
		var nextIndex = 0, indexExists;
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
	self.getScenes = function (storyboardName) {
		var result = [];
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

MM.StoryboardController = function (storyboardModel) {
	/* workflows, event processing */
	'use strict';
	var self = observable(this),
		buildStoryboardScene = function (storyboardName, index) {
			var attr = {};
			attr[storyboardName] = index;
			return {
				'storyboards': attr
			};
		};
	self.getScenes =  function () {
		var storyboardName = storyboardModel.getActiveStoryboardName();
		if (storyboardName) {
			return storyboardModel.getScenes(storyboardName);
		}
		return [];
	};
	self.addScene = function (nodeId, optionalIndexToInsertAfter) {
		var storyboardName = storyboardModel.getActiveStoryboardName(),
			scenes,
			index = 1;
		if (!storyboardName) {
			storyboardName = storyboardModel.createStoryboard();
			scenes = [];
		} else {
			if (optionalIndexToInsertAfter) {
				index = storyboardModel.insertionIndexAfter(storyboardName, optionalIndexToInsertAfter);
			}  else {
				index = storyboardModel.nextSceneIndex(storyboardName);
			}
			scenes = storyboardModel.getScenesForNodeId(nodeId);
		}
		scenes.push(buildStoryboardScene(storyboardName, index));
		storyboardModel.setScenesForNodeId(nodeId, scenes);
	};
	self.moveSceneAfter = function (sceneToMove, afterScene) {
		if (!sceneToMove) {
			return false;
		}
		var storyboardName = storyboardModel.getActiveStoryboardName(),
			scenesForIdea,
			scenes,
			newIndex,
			currentIndex,
			afterSceneIndex;
		if (!storyboardName) {
			return false;
		}
		if (afterScene && afterScene.ideaId === sceneToMove.ideaId && afterScene.index === sceneToMove.index) {
			return false;
		}
		scenes = storyboardModel.getScenes(storyboardName);
		if (!scenes || !scenes.length) {
			return false;
		}
		currentIndex = _.indexOf(scenes, _.find(scenes, function (scene) { return scene.ideaId === sceneToMove.ideaId && scene.index === sceneToMove.index; }));
		if (currentIndex === -1) {
			return false;
		}
		if (afterScene) {
			if (currentIndex > 0) {
				afterSceneIndex = _.indexOf(scenes, _.find(scenes, function (scene) { return scene.ideaId === afterScene.ideaId && scene.index === afterScene.index; }));
				if (currentIndex === (afterSceneIndex + 1)) {
					return false;
				}
			}
			newIndex = storyboardModel.insertionIndexAfter(storyboardName, afterScene.index);
		} else {
			if (currentIndex === 0) {
				return false;
			}
			newIndex = storyboardModel.insertionIndexAfter(storyboardName);
		}
		scenesForIdea = storyboardModel.getScenesForNodeId(sceneToMove.ideaId);
		_.each(scenesForIdea, function (scene) {
			if (scene.storyboards && scene.storyboards[storyboardName] && scene.storyboards[storyboardName] === sceneToMove.index) {
				scene.storyboards[storyboardName] = newIndex;
			}
		});
		storyboardModel.setScenesForNodeId(sceneToMove.ideaId, scenesForIdea);
		return true;
	};
	self.removeScene = function (sceneToRemove) {
		if (!sceneToRemove || !sceneToRemove.ideaId || !sceneToRemove.index) {
			return false;
		}
		var storyboardName = storyboardModel.getActiveStoryboardName(),
			scenes = storyboardName && storyboardModel.getScenesForNodeId(sceneToRemove.ideaId);

		if (!storyboardName) {
			return false;
		}
		_.each(scenes, function (scene) {
			if (scene.storyboards && scene.storyboards[storyboardName] && scene.storyboards[storyboardName] === sceneToRemove.index) {
				delete scene.storyboards[storyboardName];
			}
		});
		scenes = _.reject(scenes, function (scene) {
			return  _.size(scene.storyboards) === 0;
		});
		storyboardModel.setScenesForNodeId(sceneToRemove.ideaId, scenes);
	};
/*
	addEventListener('active-storyboard-changed scene-added active-scenes-changed scene-contents-changed scene-moved scene-removed', onchangeListener)
	addScene(nodeId)
	moveAfter(scene) // rehash before move if new scene index > X-1 digits...

	insertSceneAfter(nodeId, targetScene)

	remove(scene)

	setActiveStoryboardName(name)
	getActiveStoryboardName()

	activateScene(scene, deactivateOthers)
	deactivateScene(scene)
	getActiveScenes() >> [scene, ...]

*/

};


/*
 * cross-widget coordination (list of storyboards, which storyboard is active?, changes to individual scenes and storyboards)
 * converting between content and storyboard
 * managing storyboard scenes, setting active content attributes etc, listening t
 *
 *
 *
 *
 *
 *
 *
 *		repository
 *				- what are the available story boards?
 *				- add/remove/rename storyboards
 *				- listen to active content changes for root attribute storyboard list
 *				- which storyboard is active?
 *				- assume only one active to allow for cross-widget coordination
 *
 *		StoryboardModel
 *				- interact with active content
 *				- add/remove scenes, listen to active content changes
 *				- dispatch widget events when content changes
 *				- listens to repo for active storyboard changes
 *				- listens to activecontent for relevant changes to node attribs...
 */
