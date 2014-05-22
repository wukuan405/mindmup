/*global jasmine, describe, it, beforeEach, expect, afterEach, jQuery, expect, observable*/
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
		template = '<div><div data-mm-role="scene-template"><span data-mm-role="scene-title"></span></div></div>';
	beforeEach(function () {
		storyboardModel = observable(jasmine.createSpyObj('storyboardModel', ['setInputEnabled']));
		storyboardController = observable(jasmine.createSpyObj('storyboardController', ['getScenes', 'addScene']));
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
});
