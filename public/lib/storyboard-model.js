/*global MM, observable, _ */
MM.StoryboardRepository = function (activeContentListener, storyboardAttrName) {
	'use strict';
	var self = this,
		activeBoardName,
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
	/*
		getStoryboards()
		addStoryboard(name)
		removeStoryboard(name)
		renameStoryboard(name, newName)
		cloneStoryboard(name, cloneName)
		getStoryBoard(name) >> return StoryboardModel
		addEventListener('storyboard-removed storyboard-added storyboard-renamed', onchangeListener)
	*/
};

MM.StoryboardAdapter = function (activeContent, sceneAttrName) {
	/* simple syntax shugar utility methods */
	'use strict';
	var self = this,
		indexMatches = function (idx1, idx2) {
			return idx1 === idx2;
		};
	self.nextSceneIndex = function (storyboardName) {
		var index = 0;
		activeContent.traverse(function (idea) {
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
		return activeContent.getAttrById(nodeId, sceneAttrName) || [];
	};
	self.setScenesForNodeId = function (nodeId, scenes) {
		activeContent.updateAttr(nodeId, sceneAttrName, scenes);
	};
	self.insertionIndexAfter = function (storyboardName, indexToInsertAfter) {
		var nextIndex = 0, indexExists;
		activeContent.traverse(function (idea) {
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
		activeContent.traverse(function (idea) {
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
};
MM.StoryboardModel = function (repository, activeContentListener, sceneAttrName) {
	/* workflows, event processing */
	'use strict';
	var self = observable(this),
		activeIndexes = [],
		getStoryboardAdapter = function () {
			var content = activeContentListener.getActiveContent();
			if (content) {
				return new MM.StoryboardAdapter(content, sceneAttrName);
			}
		},
		buildStoryboardScene = function (storyboardName, index) {
			var attr = {};
			attr[storyboardName] = index;
			return {
				'storyboards': attr
			};
		};
	self.activateSceneAtIndex = function (index, deactivateOthers) {
		var old = activeIndexes.slice(0);
		if (deactivateOthers) {
			activeIndexes = [index];
		} else {
			if (activeIndexes.indexOf(index) >= 0) {
				return;
			}
			activeIndexes.push(index);
		}
		if (!_.isEqual(old, activeIndexes)) {
			self.dispatchEvent('activeScenesChanged', activeIndexes.slice(0));
		}
	};
	self.getActiveIndexes = function () {
		return activeIndexes.slice(0);
	};
	self.getScenes =  function () {
		var storyboardName = repository.getActiveStoryboardName(),
			storyboardAdapter = getStoryboardAdapter();
		if (storyboardName && storyboardAdapter) {
			return storyboardAdapter.getScenes(storyboardName);
		}
		return [];
	};
	self.addScene = function (nodeId, optionalIndexToInsertAfter) {
		var storyboardName = repository.getActiveStoryboardName(),
			storyboardAdapter = getStoryboardAdapter(),
			scenes,
			index = 1;
		if (!storyboardAdapter) {
			return false;
		}
		if (!storyboardName) {
			storyboardName = repository.createStoryboard();
			scenes = [];
		} else {
			if (optionalIndexToInsertAfter) {
				index = storyboardAdapter.insertionIndexAfter(storyboardName, optionalIndexToInsertAfter);
			} else if (activeIndexes.length > 0) {
				index = storyboardAdapter.insertionIndexAfter(storyboardName, _.max(activeIndexes));
			} else {
				index = storyboardAdapter.nextSceneIndex(storyboardName);
			}
			scenes = storyboardAdapter.getScenesForNodeId(nodeId);
		}
		scenes.push(buildStoryboardScene(storyboardName, index));
		storyboardAdapter.setScenesForNodeId(nodeId, scenes);

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
