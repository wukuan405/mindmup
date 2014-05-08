/*

StoryboardRepository {
	getStoryboards()
	addStoryboard(name)
	removeStoryboard(name)
	renameStoryboard(name, newName)
	cloneStoryboard(name, cloneName)
	getStoryBoard(name) >> return StoryboardModel
	addEventListener('storyboard-removed storyboard-added storyboard-renamed', onchangeListener)
}
Scene {
	nodeId
	index
}
StoryboardModel(storyboardRepo) {
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

}

*/