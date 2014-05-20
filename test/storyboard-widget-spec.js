/*global jasmine, describe, it, beforeEach, expect, afterEach, jQuery, expect*/
describe('Storyboard widget', function () {
	'use strict';
	var underTest,
		storyboardModel,
		mapModel,
		mapContainer,
		template = '<div><div data-mm-role="scene-template"><span data-mm-role="scene-title"></span></div></div>';
	beforeEach(function () {
		mapContainer = jQuery('<div>').appendTo('body');
		storyboardModel = jasmine.createSpyObj('storyboardModel', ['getScenes', 'addScene']);
		mapModel = jasmine.createSpyObj('mapModel', ['getSelectedNodeId', 'getInputEnabled']);
		mapModel.getInputEnabled.and.returnValue(true);
		underTest = jQuery(template).appendTo('body').storyboardWidget(storyboardModel, mapContainer, mapModel, '+');
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('before shown', function () {
		it('does not act on add scene key handler', function () {
			mapContainer.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardModel.addScene).not.toHaveBeenCalled();
		});
	});
	describe('when shown', function () {
		it('removes old scene content and rebuilds the UI using the list of scenes', function () {
			var scenes;
			storyboardModel.getScenes.and.returnValue([
				{ideaId: 12, title: 'already in ted storyboard', index: 1},
				{ideaId: 13, title: 'in two storyboards', index: 2}
			]);
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
			expect(storyboardModel.addScene).toHaveBeenCalledWith(23);
		});
		it('does not act on add scene key handler if input is disabled', function () {
			mapModel.getInputEnabled.and.returnValue(false);
			underTest.trigger('show');
			mapContainer.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardModel.addScene).not.toHaveBeenCalled();
		});
	});
	describe('when hidden', function () {
		it('does not act on add scene key handler', function () {
			underTest.trigger('show');
			underTest.trigger('hide');
			mapContainer.trigger(jQuery.Event('keypress', { charCode: 43 }));
			expect(storyboardModel.addScene).not.toHaveBeenCalled();
		});
	});
});
