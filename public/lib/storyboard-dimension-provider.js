/*global MM, _*/
MM.StoryboardDimensionProvider = function () {
	'use strict';
	var self = this;
	self.getDimensionsForScene = function (scene, width, height) {
		var padding = width / 16,
			result = {
			text:  {'height': height, 'width': width, 'padding-top': 0, 'padding-bottom': 0, 'padding-left': 0, 'padding-right': 0},
			image: {
				toCss: function () {
					return {
						'background-image': '',
						'background-repeat': '',
						'background-size': '',
						'background-position': ''
					};
				}
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
			if (scene.image.position === 'top' || scene.image.position === 'bottom') {
				maxImageHeight = height / 2 - padding;
				result.text['padding-' + scene.image.position] = height / 2;
				result.text.height = height / 2 - padding;
			}
			else if (scene.image.position === 'left' || scene.image.position  === 'right') {
				maxImageWidth = width / 2 - padding;
				result.text['padding-' + scene.image.position] = width / 2 - padding;
				result.text['padding-'  + opposite[scene.image.position]] = padding;
				result.text.width = width / 2 -  padding;
			}
			imageScale = maxImageWidth / scene.image.width;
			if (imageScale > maxImageHeight / scene.image.height) {
				imageScale = maxImageHeight / scene.image.height;
			}
			result.image = {
				'url': scene.image.url,
				'height': (imageScale * scene.image.height),
				'width': (imageScale * scene.image.width),
			};
			if (scene.image.position === 'top') {
				result.image.top = padding;
				result.image.left = (width - result.image.width) / 2;
			}
			else if (scene.image.position === 'bottom') {
				result.image.top = height - result.image.height - padding;
				result.image.left = (width - result.image.width) / 2;
			}
			else if (scene.image.position === 'left') {
				result.image.top = (height - result.image.height) / 2;
				result.image.left = padding;
			}
			else if (scene.image.position === 'right') {
				result.image.top = (height - result.image.height) / 2;
				result.image.left = width - padding - result.image.width;
			} else {
				result.image.top = (height - result.image.height) / 2;
				result.image.left = (width - result.image.width) / 2;
			}
			result.image.toCss = function () {
				return {
					'background-image': 'url("' + scene.image.url + '")',
					'background-repeat': 'no-repeat',
					'background-size': (imageScale * scene.image.width) + 'px ' + (imageScale * scene.image.height) + 'px',
					'background-position':  result.image.left + 'px ' + result.image.top + 'px'
				};
			};
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
