/*global MM, observable, _ */
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
	self.removeScenesForIdeaId = function (ideaId) {
		var storyboardName = storyboardModel.getActiveStoryboardName(),
			scenes = storyboardName && storyboardModel.getScenesForNodeId(ideaId),
			didRemoveScene;

		if (!storyboardName) {
			return false;
		}
		_.each(scenes, function (scene) {
			if (scene.storyboards && scene.storyboards[storyboardName]) {
				delete scene.storyboards[storyboardName];
				didRemoveScene = true;
			}
		});
		if (!didRemoveScene) {
			return false;
		}
		scenes = _.reject(scenes, function (scene) {
			return  _.size(scene.storyboards) === 0;
		});
		storyboardModel.setScenesForNodeId(ideaId, scenes);
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
};