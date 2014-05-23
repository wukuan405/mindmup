/*global jQuery, _, Hammer*/
jQuery.fn.storyboardWidget = function (storyboardController, storyboardModel) {
	'use strict';
	return jQuery.each(this, function () {
		var element = jQuery(this),
			template = element.find('[data-mm-role=scene-template]'),
			templateParent = template.parent(),
			removeSelectedScenes = function () {
				_.each(templateParent.find('.activated-scene'), function (domScene) {
					var scene = jQuery(domScene).data('scene');
					if (scene) {
						storyboardController.removeScene(scene);
					}
				});
			},
			moveSceneLeft = function (scene) {
				var thisScene = scene && scene.data('scene'),
					prev = thisScene && scene.prev() && scene.prev().prev(),
					prevScene = prev && prev.data('scene');
				if (thisScene) {
					storyboardController.moveSceneAfter(thisScene, prevScene);
				}
			},
			moveSceneRight = function (scene) {
				var thisScene = scene && scene.data('scene'),
					next = thisScene && scene.next(),
					nextScene = next && next.data('scene');
				if (thisScene && nextScene) {
					storyboardController.moveSceneAfter(thisScene, nextScene);
				}
			},
			moveFocusSceneLeft = function () {
				moveSceneLeft(templateParent.find('.activated-scene'));
			},
			moveFocusSceneRight = function () {
				moveSceneRight(templateParent.find('.activated-scene'));
			},
			potentialDropTargets = function (dropPosition) {
				var scenes = templateParent.find('[data-mm-role=scene]').not('.activated-scene').not('.drag-shadow'),
					row = _.filter(scenes, function (sceneDOM) {
						var scene = jQuery(sceneDOM);
						var ypos = dropPosition.top - scene.offset().top,
							sceneHeight =  scene.outerHeight(true),
							withinRow = (ypos > 0 && ypos < sceneHeight);
						return withinRow;
					}),
					potentialRight = _.filter(row, function (sceneDOM) {
						var scene = jQuery(sceneDOM);
						var xpos = dropPosition.left - scene.offset().left,
							sceneWidth = scene.outerWidth(true),
							leftMatch = (xpos > -20 && xpos < sceneWidth / 3);
						return leftMatch;
					}),
					potentialLeft = _.filter(row, function (sceneDOM) {
						var scene = jQuery(sceneDOM);
						var xpos = dropPosition.left - scene.offset().left,
							sceneWidth = scene.outerWidth(true),
							rightMatch = (xpos > sceneWidth * 2 / 3 && xpos < sceneWidth + 20);
						return rightMatch;
					});
				return {left: potentialLeft, right: potentialRight};
			},
			rebuildStoryboard = function () {
				var sceneCount  = templateParent.find('[data-mm-role=scene]').length;
				templateParent.empty();
				_.each(storyboardController.getScenes(), function (scene) {
					var newScene = template.clone()
						.appendTo(templateParent)
						.data('scene', scene)
						.attr({
							'data-mm-role': 'scene',
							'data-mm-idea-id': scene.ideaId,
							'data-mm-index': scene.index,
							'tabindex': 1
						})
						.on('focus', function () {
							templateParent.find('[data-mm-role=scene]').removeClass('activated-scene');
							newScene.addClass('activated-scene');
						}).keydown('del backspace', function (event) {
							storyboardController.removeScene(scene);
							event.preventDefault();
							event.stopPropagation();
						})
						.keydown('meta+right ctrl+right', function () {
							moveSceneRight(jQuery(this));
						})
						.keydown('meta+left ctrl+left', function () {
							moveSceneLeft(jQuery(this));
						})
						.keydown('right', function () {
							jQuery(this).next().focus();
						})
						.keydown('left', function () {
							jQuery(this).prev().focus();
						})
						.keydown('up', function () {
							jQuery(this).gridUp().focus();
						})
						.keydown('down', function () {
							jQuery(this).gridDown().focus();
						}).shadowDraggable().on('mm:cancel-dragging', function () {
							jQuery(this).siblings().removeClass('potential-drop-left potential-drop-right');
						}).on('mm:stop-dragging', function () {

							var dropTarget = jQuery(this),
								potentialLeft = dropTarget.parent().find('.potential-drop-left'),
								potentialRight = dropTarget.parent().find('.potential-drop-right');
							if (potentialLeft && potentialLeft[0]) {
								storyboardController.moveSceneAfter(dropTarget.data('scene'), potentialLeft.data('scene'));
							} else if (potentialRight && potentialRight[0]) {
								potentialLeft = potentialRight.prev();
								if (potentialLeft && potentialLeft[0]) {
									storyboardController.moveSceneAfter(dropTarget.data('scene'), potentialLeft.data('scene'));
								} else {
									storyboardController.moveSceneAfter(dropTarget.data('scene'));
								}
							}
							jQuery(this).siblings().removeClass('potential-drop-left potential-drop-right');
						}).on('mm:drag', function (e) {
							if (e && e.gesture && e.gesture.center) {
								var potentialDrops = potentialDropTargets({left: e.gesture.center.pageX, top: e.gesture.center.pageY});
								jQuery(this).siblings().not(potentialDrops.left).not(potentialDrops.right).removeClass('potential-drop-left potential-drop-right');
								if (potentialDrops.left) {
									jQuery(potentialDrops.left).not(jQuery(this).prev()).addClass('potential-drop-left');
								}
								if (potentialDrops.right) {
									jQuery(potentialDrops.right).not(jQuery(this).next()).addClass('potential-drop-right');
								}
							}
						});

					newScene.find('[data-mm-role=scene-title]').text(scene.title);

				});
				//focus on last scene if one has been added -- we can remove this when delta changes are in place
				if (sceneCount < templateParent.find('[data-mm-role=scene]').length) {
					templateParent.find('[data-mm-role=scene]').last().focus();
				}
			},
			showStoryboard = function () {
				storyboardModel.setInputEnabled(true);
				rebuildStoryboard();
				storyboardModel.addEventListener('storyboardRebuilt', rebuildStoryboard);
			},
			hideStoryboard = function () {
				storyboardModel.setInputEnabled(false);
				storyboardModel.removeEventListener('storyboardRebuilt', rebuildStoryboard);
			};
		element.find('[data-mm-role=storyboard-remove-scene]').click(removeSelectedScenes);
		element.find('[data-mm-role=storyboard-move-scene-left]').click(moveFocusSceneLeft);
		element.find('[data-mm-role=storyboard-move-scene-right]').click(moveFocusSceneRight);
		/*jshint newcap:false*/
		Hammer(element);
		element.find('.storyboard-container').simpleDraggableContainer();
		template.detach();
		element.on('show', showStoryboard).on('hide', hideStoryboard);
	});
};

jQuery.fn.storyboardKeyHandlerWidget = function (storyboardController, storyboardModel, mapModel, addSceneHotkey) {
	'use strict';
	var element = this,
		addSceneHandler = function (evt) {
		var unicode = evt.charCode || evt.keyCode,
			actualkey = String.fromCharCode(unicode);
		if (actualkey === addSceneHotkey && mapModel.getInputEnabled()) {
			storyboardController.addScene(mapModel.getSelectedNodeId());
		}
	};
	storyboardModel.addEventListener('inputEnabled', function (isEnabled) {
		if (isEnabled) {
			element.on('keypress', addSceneHandler);
		} else {
			element.off('keypress', addSceneHandler);
		}
	});
	return element;
};

jQuery.fn.storyboardMenuWidget = function (storyboardController, storyboardModel, mapModel) {
	'use strict';
	var elements = this,
		setVisibility  = function (isEnabled) {
			if (isEnabled) {
				elements.show();
			} else {
				elements.hide();
			}
		};

	elements.find('[data-mm-role=storyboard-add-scene]').click(function () {
		storyboardController.addScene(mapModel.getSelectedNodeId());
	});
	storyboardModel.addEventListener('inputEnabled', setVisibility);
	setVisibility(storyboardModel.getInputEnabled());
	return elements;
};
/*


 storyboard widget on shown -> notify controller that storyboard is active
 storyboard widget on hide -> notify controller that storyboard is no longer active

 controller -> model -> active storyboard -> event published

 model event -> addSceneWidget
	- attach/detach keyboard addSceneHandler
	- hide/show menu items
*/
