/*global MM, _*/
MM.StoryboardDimensionProvider = function () {
	'use strict';
	var self = this;
	self.getDimensionsForScene = function (scene, width, height) {
		var padding = width / 16,
			result = {
			text:  {'height': height, 'width': width, 'padding-top': 0, 'padding-bottom': 0, 'padding-left': 0, 'padding-right': 0},
			image: {
				'background-image': '',
				'background-repeat': '',
				'background-size': '',
				'background-position': ''
			}
		},
		imageScale = 1, maxImageHeight = height - 2 * padding, maxImageWidth = width - 2 * padding,
		opposite = {
			'top': 'bottom',
			'bottom': 'top',
			'right': 'left',
			'left': 'right'
		};

		if (scene.image) {
			result.image = {
					'background-image': 'url("' + scene.image.url + '")',
					'background-repeat': 'no-repeat',
					'background-position': 'center center'
				};
			if (scene.image.position === 'top' || scene.image.position === 'bottom') {
				maxImageHeight = height / 2 - padding;
				result.text['padding-' + scene.image.position] = height / 2;
				result.text.height = height / 2 - padding;
				result.image['background-position'] = 'center ' + scene.image.position + ' ' + padding + 'px';
			}
			else if (scene.image.position === 'left' || scene.image.position  === 'right') {
				maxImageWidth = width / 2 - padding;
				result.image['background-position'] = scene.image.position + ' ' + padding + 'px center';
				result.text['padding-' + scene.image.position] = width / 2 - padding;
				result.text['padding-'  + opposite[scene.image.position]] = padding;
				result.text.width = width / 2 -  padding;
			}
			imageScale = maxImageWidth / scene.image.width;
			if (imageScale > maxImageHeight / scene.image.height) {
				imageScale = maxImageHeight / scene.image.height;
			}
			result.image['background-size'] = (imageScale * scene.image.width) + 'px ' + (imageScale * scene.image.height) + 'px';
		}
		return result;
	};

};

MM.buildStoryboardExporter = function (storyboardModel) {
	'use strict';
	return function () {
		var scenes = storyboardModel.getScenes(),
			dimensionProvider = new MM.StoryboardDimensionProvider();
		return {storyboard:
			_.map(scenes, function (scene) {
				return _.extend({title: scene.title}, dimensionProvider.getDimensionsForScene(scene, 800, 600));
			})
		};
	};
};
