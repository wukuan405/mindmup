/*global spyOn, MAPJS, jasmine, describe, it, MM, observable, expect, beforeEach, localStorage*/
describe('Auto save', function () {
	'use strict';
	var storage, mapController, autoSave, unsavedChangesAvailableListener, idea, alert, mapModel;
	beforeEach(function () {
		storage = MM.jsonStorage(localStorage);
		mapModel = jasmine.createSpyObj('mapModel', ['pause', 'resume']);
		mapController = observable({});
		alert = {show: function () {} };
		autoSave = new MM.AutoSave(mapController, storage, alert, mapModel);
		unsavedChangesAvailableListener = jasmine.createSpy('unsavedChangesAvailableListener');
		idea = observable({});
		storage.remove('auto-save-mapId');
		spyOn(alert, 'show');
	});
	it('should trigger unsavedChangesAvailable event when unsaved changes exist for loaded map', function () {
		autoSave.addEventListener('unsavedChangesAvailable', unsavedChangesAvailableListener);
		storage.setItem('auto-save-mapId', 'existing events');

		mapController.dispatchEvent('mapLoaded', 'mapId', idea);

		expect(unsavedChangesAvailableListener).toHaveBeenCalledWith('mapId');
	});
	it('should not trigger unsavedChangesAvailable when no local changes exist', function () {
		autoSave.addEventListener('unsavedChangesAvailable', unsavedChangesAvailableListener);

		mapController.dispatchEvent('mapLoaded', 'mapId', idea);

		expect(unsavedChangesAvailableListener).not.toHaveBeenCalled();
	});
	describe('event caching', function () {
		it('should cache all change events to storage until map is saved', function () {
			var changeCmd = 'updateTitle',
				changeArgs = [1, 'new'];
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			spyOn(storage, 'setItem');

			idea.dispatchEvent('changed', changeCmd, changeArgs);

			expect(storage.setItem).toHaveBeenCalledWith('auto-save-mapId', [ {cmd: 'updateTitle', args: [1, 'new']} ]);
		});
		it('should not cache any change events if map is autoSaved', function () {
			var changeCmd = 'updateTitle',
				changeArgs = [1, 'new'];
			mapController.dispatchEvent('mapLoaded', 'mapId', idea, {autoSave: true});
			spyOn(storage, 'setItem');
			idea.dispatchEvent('changed', changeCmd, changeArgs);
			expect(storage.setItem).not.toHaveBeenCalled();
		});
		it('should not cache change events if map controller says the map is autosaved', function () {
			var changeCmd = 'updateTitle',
				changeArgs = [1, 'new'];
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			spyOn(storage, 'setItem').and.callThrough();

			idea.dispatchEvent('changed', changeCmd, changeArgs);

			expect(storage.setItem).toHaveBeenCalledWith('auto-save-mapId', [ {cmd: 'updateTitle', args: [1, 'new']} ]);
		});
		it('should append multiple change events to storage', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			spyOn(storage, 'setItem').and.callThrough();

			idea.dispatchEvent('changed', 'cmd1', [1]);
			idea.dispatchEvent('changed', 'cmd2', [2]);

			expect(storage.setItem).toHaveBeenCalledWith('auto-save-mapId', [ {cmd: 'cmd1', args: [1]}, {cmd: 'cmd2', args: [2]} ]);
		});
		it('should not mix events from different documents', function () {
			var idea2 = observable({});
			mapController.dispatchEvent('mapLoaded', 'mapId2', idea2);
			idea2.dispatchEvent('changed', 'cmd1', [1]);
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			spyOn(storage, 'setItem').and.callThrough();

			idea.dispatchEvent('changed', 'cmd2', [2]);

			expect(storage.setItem).toHaveBeenCalledWith('auto-save-mapId', [ {cmd: 'cmd2', args: [2]} ]);
		});
		it('should not record previously saved events', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			idea.dispatchEvent('changed', 'cmd1', [1]);
			mapController.dispatchEvent('mapSaved', 'mapId', idea);
			spyOn(storage, 'setItem').and.callThrough();

			idea.dispatchEvent('changed', 'cmd2', [2]);

			expect(storage.setItem).toHaveBeenCalledWith('auto-save-mapId', [ {cmd: 'cmd2', args: [2]} ]);
		});
		it('should unsubscribe old listener when map saved with new id and idea is changed', function () {
			var newIdea = observable({});
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			spyOn(idea, 'removeEventListener').and.callThrough();
			spyOn(newIdea, 'addEventListener').and.callThrough();

			mapController.dispatchEvent('mapSaved', 'newmapId', newIdea);

			expect(idea.removeEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
			expect(newIdea.addEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
		});
		it('should unsubscribe old listener when map saved with new id and idea is not changed', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			spyOn(idea, 'removeEventListener').and.callThrough();
			spyOn(idea, 'addEventListener').and.callThrough();

			mapController.dispatchEvent('mapSaved', 'newmapId', idea);

			expect(idea.removeEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
			expect(idea.addEventListener).toHaveBeenCalledWith('changed', jasmine.any(Function));
		});
		it('should use latest map id if saved with a new map id', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			mapController.dispatchEvent('mapSaved', 'newmapId', idea);
			spyOn(storage, 'setItem').and.callThrough();

			idea.dispatchEvent('changed', 'cmd2', [2]);

			expect(storage.setItem).toHaveBeenCalledWith('auto-save-newmapId', [ {cmd: 'cmd2', args: [2]} ]);
		});
		it('should drop unsaved changes from storage when a map is saved', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			idea.dispatchEvent('changed', 'cmd1', [1]);
			spyOn(storage, 'remove');

			mapController.dispatchEvent('mapSaved', 'mapId', idea);

			expect(storage.remove).toHaveBeenCalledWith('auto-save-mapId');
		});
		it('should drop unsaved changes even when map ID changes and the map is saved (s3 case, or transfer to new storage)', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			idea.dispatchEvent('changed', 'cmd1', [1]);
			spyOn(storage, 'remove');

			mapController.dispatchEvent('mapSaved', 'newMapId', idea);

			expect(storage.remove).toHaveBeenCalledWith('auto-save-mapId');
		});
		it('should warn when changes could not be saved', function () {
			spyOn(storage, 'setItem').and.throwError('failed');
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			idea.dispatchEvent('changed', 'cmd1', [1]);
			expect(alert.show).toHaveBeenCalled();
		});
		it('should not warn for the same map twice', function () {
			spyOn(storage, 'setItem').and.throwError('failed');
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			idea.dispatchEvent('changed', 'cmd1', [1]);
			alert.show.calls.reset();

			idea.dispatchEvent('changed', 'cmd1', [1]);

			expect(alert.show).not.toHaveBeenCalled();
		});
		it('should show warning after save', function () {
			spyOn(storage, 'setItem').and.throwError('failed');
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			idea.dispatchEvent('changed', 'cmd1', [1]);
			mapController.dispatchEvent('mapSaved', 'mapId', idea);
			alert.show.calls.reset();

			idea.dispatchEvent('changed', 'cmd1', [1]);

			expect(alert.show).toHaveBeenCalled();
		});
		it('should show warning after load', function () {
			spyOn(storage, 'setItem').and.throwError('failed');
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			idea.dispatchEvent('changed', 'cmd1', [1]);
			mapController.dispatchEvent('mapLoaded', 'mapId', idea);
			alert.show.calls.reset();

			idea.dispatchEvent('changed', 'cmd1', [1]);

			expect(alert.show).toHaveBeenCalled();
		});
	});
	describe('applyUnsavedChanges', function () {
		it('should apply all unsaved events to the current idea aggregate', function () {
			var aggregate = MAPJS.content({id: 1, title: 'old'});
			storage.setItem('auto-save-mapId', [ {cmd: 'updateTitle', args: [1, 'new title']} ]);
			mapController.dispatchEvent('mapLoaded', 'mapId', aggregate);

			autoSave.applyUnsavedChanges();

			expect(aggregate.title).toBe('new title');
		});
		it('should do nothing - but not break - if there are no unsaved changes', function () {
			var aggregate = MAPJS.content({id: 1, title: 'old'});
			mapController.dispatchEvent('mapLoaded', 'mapId', aggregate);

			autoSave.applyUnsavedChanges();

			expect(aggregate.title).toBe('old');
		});
		it('should pause and resume whilte applying saved changes', function () {
			var aggregate = MAPJS.content({id: 1, title: 'old'});
			storage.setItem('auto-save-mapId', [ {cmd: 'updateTitle', args: [1, 'new title']} ]);
			mapController.dispatchEvent('mapLoaded', 'mapId', aggregate);

			autoSave.applyUnsavedChanges();

			expect(mapModel.pause).toHaveBeenCalled();
			expect(mapModel.resume).toHaveBeenCalled();
		});
	});
	describe('discardUnsavedChanges', function () {
		it('should drop unsaved changes from storage without applying them', function () {
			var aggregate = MAPJS.content({id: 1, title: 'old'});
			storage.setItem('auto-save-mapId', [ {cmd: 'updateTitle', args: [1, 'new title']} ]);
			mapController.dispatchEvent('mapLoaded', 'mapId', aggregate);
			spyOn(storage, 'remove');

			autoSave.discardUnsavedChanges();

			expect(storage.remove).toHaveBeenCalledWith('auto-save-mapId');
			expect(aggregate.title).toBe('old');
		});
	});
});
