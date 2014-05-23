/*global jasmine, describe, it, beforeEach, expect, afterEach, jQuery, expect, observable, spyOn*/
describe('storyboardMenuWidget', function () {
	'use strict';
	var template = '<span id="test-menu"><a data-mm-role="storyboard-add-scene"></a></span>',
		storyboardController,
		storyboardModel,
		mapModel,
		underTest;
	beforeEach(function () {

		storyboardModel = observable(jasmine.createSpyObj('storyboardModel', ['setInputEnabled', 'getInputEnabled']));
		storyboardController = observable(jasmine.createSpyObj('storyboardController', ['getScenes', 'addScene']));
		mapModel = jasmine.createSpyObj('mapModel', ['getSelectedNodeId', 'getInputEnabled']);
		underTest = jQuery(template).appendTo('body').storyboardMenuWidget(storyboardController, storyboardModel, mapModel);
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('before input is enabled on storyboardModel', function () {
		it('should be hidden', function () {
			expect(underTest.css('display')).toBe('none');
		});
		it('should be shown if storyboardModel.getInputEnabled is true', function () {
			storyboardModel.getInputEnabled.and.returnValue(true);
			underTest.remove();
			underTest = jQuery(template).appendTo('body').storyboardMenuWidget(storyboardController, storyboardModel, mapModel);
			expect(underTest.css('display')).not.toBe('none');
		});
	});
	describe('after input is enabled on storyboardModel', function () {
		beforeEach(function () {
			storyboardModel.dispatchEvent('inputEnabled', true);
		});
		it('should be visible', function () {
			expect(underTest.css('display')).not.toBe('none');
		});
		it('should add scene when add-scene link is clicked', function () {
			mapModel.getSelectedNodeId.and.returnValue(23);
			underTest.find('[data-mm-role=storyboard-add-scene]').click();
			expect(storyboardController.addScene).toHaveBeenCalledWith(23);
		});
		describe('when subsequently disabled', function () {
			it('should be hidden', function () {
				storyboardModel.dispatchEvent('inputEnabled', false);
				expect(underTest.css('display')).toBe('none');
			});
		});
	});
});
describe('storyboardKeyHandlerWidget', function () {
	'use strict';
	var storyboardController,
		storyboardModel,
		mapModel,
		underTest;
	beforeEach(function () {

		storyboardModel = observable(jasmine.createSpyObj('storyboardModel', ['setInputEnabled']));
		storyboardController = observable(jasmine.createSpyObj('storyboardController', ['getScenes', 'addScene']));
		mapModel = jasmine.createSpyObj('mapModel', ['getSelectedNodeId', 'getInputEnabled']);
		mapModel.getInputEnabled.and.returnValue(true);
		underTest = jQuery('<div>').appendTo('body').storyboardKeyHandlerWidget(storyboardController, storyboardModel, mapModel, '+');
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('before input is enabled on storyboardModel', function () {
		it('does not act on add scene key handler', function () {
			underTest.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardController.addScene).not.toHaveBeenCalled();
		});
	});
	describe('after input is enabled on storyboardModel', function () {
		beforeEach(function () {
			storyboardModel.dispatchEvent('inputEnabled', true);
		});
		it('acts on add scene key handler', function () {
			mapModel.getSelectedNodeId.and.returnValue(23);
			underTest.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardController.addScene).toHaveBeenCalledWith(23);
		});
		it('does not act on add scene key handler if input is disabled', function () {
			mapModel.getInputEnabled.and.returnValue(false);
			underTest.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardController.addScene).not.toHaveBeenCalled();
		});
		describe('when subsequently disabled', function () {
			it('does not act on add scene key handler', function () {
				storyboardModel.dispatchEvent('inputEnabled', false);
				underTest.trigger(jQuery.Event('keypress', { charCode: 43 }));
				expect(storyboardController.addScene).not.toHaveBeenCalled();
			});
		});
	});
});
describe('Storyboard widget', function () {
	'use strict';
	var underTest,
		storyboardController,
		storyboardModel,
		template = '<div><div><a data-mm-role="storyboard-remove-scene"></a></div><div id="sceneParent"><div data-mm-role="scene-template"><span data-mm-role="scene-title"></span></div></div></div>';
	beforeEach(function () {
		storyboardModel = observable(jasmine.createSpyObj('storyboardModel', ['setInputEnabled']));
		storyboardController = observable(jasmine.createSpyObj('storyboardController', ['getScenes', 'addScene', 'removeScene', 'moveSceneAfter']));
		storyboardController.getScenes.and.returnValue([
			{ideaId: 12, title: 'already in ted storyboard', index: 1},
			{ideaId: 13, title: 'in two storyboards', index: 2}
		]);
		underTest = jQuery(template).appendTo('body').storyboardWidget(storyboardController, storyboardModel);
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('when shown', function () {
		it('removes old scene content and rebuilds the UI using the list of scenes', function () {
			var scenes;
			underTest.find('#sceneParent').append('<div data-mm-role="scene">BBB</div>');
			underTest.trigger('show');
			scenes = underTest.find('[data-mm-role=scene]');

			expect(scenes.length).toBe(2);

			expect(scenes.first().attr('data-mm-idea-id')).toEqual('12');
			expect(scenes.first().attr('data-mm-index')).toEqual('1');
			expect(scenes.first().find('[data-mm-role=scene-title]').text()).toEqual('already in ted storyboard');

			expect(scenes.last().attr('data-mm-idea-id')).toEqual('13');
			expect(scenes.last().attr('data-mm-index')).toEqual('2');
			expect(scenes.last().find('[data-mm-role=scene-title]').text()).toEqual('in two storyboards');
		});
		it('sets storyboardModel to be editing enabled', function () {
			underTest.trigger('show');
			expect(storyboardModel.setInputEnabled).toHaveBeenCalledWith(true);
		});
		it('rebuilds a storyboard using new scenes on a sceneAdded event', function () {
			var scenes;
			underTest.trigger('show');

			storyboardController.getScenes.and.returnValue([
				{ideaId: 12, title: 'already in ted storyboard', index: 1},
				{ideaId: 14, title: 'inside', index: 5}
			]);
			storyboardModel.dispatchEvent('storyboardRebuilt');

			scenes = underTest.find('[data-mm-role=scene]');

			expect(scenes.length).toBe(2);

			expect(scenes.first().attr('data-mm-idea-id')).toEqual('12');
			expect(scenes.first().attr('data-mm-index')).toEqual('1');
			expect(scenes.first().find('[data-mm-role=scene-title]').text()).toEqual('already in ted storyboard');

			expect(scenes.last().attr('data-mm-idea-id')).toEqual('14');
			expect(scenes.last().attr('data-mm-index')).toEqual('5');
			expect(scenes.last().find('[data-mm-role=scene-title]').text()).toEqual('inside');
		});
	});
	describe('when hidden', function () {
		it('sets storyboardModel to be editing enabled', function () {
			underTest.trigger('show');
			storyboardModel.setInputEnabled.calls.reset();
			underTest.trigger('hide');
			expect(storyboardModel.setInputEnabled).toHaveBeenCalledWith(false);
		});
		it('does not update content on sceneAdded', function () {
			var scenes;
			underTest.trigger('show');
			underTest.trigger('hide');

			storyboardController.getScenes.and.returnValue([
				{ideaId: 12, title: 'already in ted storyboard', index: 1},
				{ideaId: 14, title: 'inside', index: 5}
			]);
			storyboardModel.dispatchEvent('storyboardRebuilt');

			scenes = underTest.find('[data-mm-role=scene]');

			expect(scenes.length).toBe(2);
			expect(scenes.last().attr('data-mm-idea-id')).toEqual('13');
			expect(scenes.last().attr('data-mm-index')).toEqual('2');
			expect(scenes.last().find('[data-mm-role=scene-title]').text()).toEqual('in two storyboards');
		});
	});
	describe('navigating a stroyboard', function () {
		var dummyElement, selectedScene;
		beforeEach(function () {
			underTest.trigger('show');

			storyboardController.getScenes.and.returnValue([
				{ideaId: 12, title: 'already in ted storyboard', index: 1},
				{ideaId: 14, title: 'inside', index: 5}
			]);
			storyboardModel.dispatchEvent('storyboardRebuilt');
			selectedScene = underTest.find('[data-mm-role=scene]').last();
			selectedScene.focus();
			dummyElement = underTest.find('[data-mm-role=scene]').first();
			spyOn(jQuery.fn, 'focus').and.callThrough();
		});
		describe('responds to direction keys for navigation', [
			['left', 37, 'prev'],
			['up', 38, 'gridUp'],
			['right', 39, 'next'],
			['down', 40, 'gridDown']
		], function (keycode, jQueryFunction) {
			spyOn(jQuery.fn, jQueryFunction).and.returnValue(dummyElement);
			var evt = jQuery.Event('keydown', {which: keycode});
			selectedScene.trigger(evt);
			expect(jQuery.fn[jQueryFunction]).toHaveBeenCalledOnJQueryObject(selectedScene);
			expect(jQuery.fn.focus).toHaveBeenCalledOnJQueryObject(dummyElement);
		});
	});
	describe('editing a storyboard', function () {
		beforeEach(function () {
			underTest.trigger('show');

			storyboardController.getScenes.and.returnValue([
				{ideaId: 12, title: 'already in ted storyboard', index: 1},
				{ideaId: 15, title: 'inside', index: 3},
				{ideaId: 14, title: 'inside', index: 5}
			]);
			storyboardModel.dispatchEvent('storyboardRebuilt');
			underTest.find('[data-mm-role=scene]').last().focus();
		});
		it('should remove scene when storyboard-remove-scene menu item is clicked', function () {
			underTest.find('[data-mm-role=storyboard-remove-scene]').click();
			expect(storyboardController.removeScene).toHaveBeenCalledWith({ideaId: 14, title: 'inside', index: 5});
			expect(storyboardController.removeScene.calls.count()).toBe(1);
		});
		describe('should move a node', function () {
			describe('later in the storyboard', function () {
				var selectedScene, sceneBeingMoved;
				beforeEach(function () {
					selectedScene = underTest.find('[data-mm-role=scene]').eq(1);
					sceneBeingMoved = {ideaId: 15, title: 'inside', index: 3};
					selectedScene.focus();
				});
				it('when meta+right is clicked', function () {
					var evt = jQuery.Event('keydown', {which: 39, metaKey: true});
					selectedScene.trigger(evt);
					expect(storyboardController.moveSceneAfter).toHaveBeenCalledWith(sceneBeingMoved, {ideaId: 14, title: 'inside', index: 5});
				});
				it('when ctrl+right is clicked', function () {
					var evt = jQuery.Event('keydown', {which: 39, ctrlKey: true});
					selectedScene.trigger(evt);
					expect(storyboardController.moveSceneAfter).toHaveBeenCalledWith(sceneBeingMoved, {ideaId: 14, title: 'inside', index: 5});
				});
			});


			describe('earlier in the storyboard', function () {
				var selectedScene, sceneBeingMoved, movedBefore;
				beforeEach(function () {
					selectedScene = underTest.find('[data-mm-role=scene]').last();
					sceneBeingMoved = {ideaId: 14, title: 'inside', index: 5};
					movedBefore = {ideaId: 12, title: 'already in ted storyboard', index: 1};
					selectedScene.focus();
				});
				it('when meta+left is clicked', function () {
					var evt = jQuery.Event('keydown', {which: 37, metaKey: true});
					selectedScene.trigger(evt);
					expect(storyboardController.moveSceneAfter).toHaveBeenCalledWith(sceneBeingMoved, movedBefore);
				});
				it('when ctrl+left is clicked', function () {
					var evt = jQuery.Event('keydown', {which: 37, ctrlKey: true});
					selectedScene.trigger(evt);
					expect(storyboardController.moveSceneAfter).toHaveBeenCalledWith(sceneBeingMoved, movedBefore);
				});
			});
			describe('the second scene to the start of the list', function () {
				var selectedScene,
					sceneBeingMoved;

				beforeEach(function () {
					selectedScene = underTest.find('[data-mm-role=scene]').eq(1);
					sceneBeingMoved = {ideaId: 15, title: 'inside', index: 3};
					selectedScene.focus();
				});
				it('when meta+left is clicked', function () {
					var evt = jQuery.Event('keydown', {which: 37, ctrlKey: true});
					selectedScene.trigger(evt);
					expect(storyboardController.moveSceneAfter).toHaveBeenCalledWith(sceneBeingMoved, undefined);
				});
				it('when ctrl+left is clicked', function () {
					var evt = jQuery.Event('keydown', {which: 37, metaKey: true});
					selectedScene.trigger(evt);
					expect(storyboardController.moveSceneAfter).toHaveBeenCalledWith(sceneBeingMoved, undefined);
				});
			});
		});
	});
});
