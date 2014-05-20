/*global jasmine, describe, it, beforeEach, expect, afterEach, jQuery, expect, observable*/
describe('Storyboard widget', function () {
	'use strict';
	var underTest,
		storyboardController,
		mapModel,
		mapContainer,
		template = '<div><div data-mm-role="scene-template"><span data-mm-role="scene-title"></span></div></div>';
	beforeEach(function () {
		mapContainer = jQuery('<div>').appendTo('body');
		storyboardController = observable(jasmine.createSpyObj('storyboardController', ['getScenes', 'addScene', 'addListener', 'removeListener']));
		mapModel = jasmine.createSpyObj('mapModel', ['getSelectedNodeId', 'getInputEnabled']);
		mapModel.getInputEnabled.and.returnValue(true);
		storyboardController.getScenes.and.returnValue([
			{ideaId: 12, title: 'already in ted storyboard', index: 1},
			{ideaId: 13, title: 'in two storyboards', index: 2}
		]);
		underTest = jQuery(template).appendTo('body').storyboardWidget(storyboardController, mapContainer, mapModel, '+');
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('before shown', function () {
		it('does not act on add scene key handler', function () {
			mapContainer.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardController.addScene).not.toHaveBeenCalled();
		});
	});
	describe('when shown', function () {
		it('removes old scene content and rebuilds the UI using the list of scenes', function () {
			var scenes;
			underTest.append('<div data-mm-role="scene">BBB</div>');
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
		it('acts on add scene key handler', function () {
			underTest.trigger('show');
			mapModel.getSelectedNodeId.and.returnValue(23);
			mapContainer.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardController.addScene).toHaveBeenCalledWith(23);
		});
		it('does not act on add scene key handler if input is disabled', function () {
			mapModel.getInputEnabled.and.returnValue(false);
			underTest.trigger('show');
			mapContainer.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardController.addScene).not.toHaveBeenCalled();
		});
		it('rebuilds a storyboard using new scenes on a sceneAdded event', function () {
			var scenes;
			underTest.trigger('show');

			storyboardController.getScenes.and.returnValue([
				{ideaId: 12, title: 'already in ted storyboard', index: 1},
				{ideaId: 14, title: 'inside', index: 5}
			]);

			storyboardController.addListener.calls.mostRecent().args[0]();

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
		it('does not act on add scene key handler', function () {
			underTest.trigger('show');
			underTest.trigger('hide');
			mapContainer.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardController.addScene).not.toHaveBeenCalled();
		});
		it('does not update content on sceneAdded', function () {
			underTest.trigger('show');
			underTest.trigger('hide');
			expect(storyboardController.removeListener).toHaveBeenCalledWith(storyboardController.addListener.calls.mostRecent().args[0]);
		});
	});
});
