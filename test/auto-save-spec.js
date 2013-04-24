/*global spyOn, MAPJS, jasmine, describe, it, MM, observable, expect, beforeEach*/
describe('Auto save', function () {
	'use strict';
	var storage, mapRepository, autoSave, unsavedChangesAvailableListener, idea;
	beforeEach(function () {
		storage = new MM.BrowserContainer().storage;
		mapRepository = observable({});
		autoSave = new MM.AutoSave(mapRepository, storage);
		unsavedChangesAvailableListener = jasmine.createSpy('unsavedChangesAvailableListener');
		idea = observable({});
		storage.removeItem('auto-save-mapId');
	});
	it('should trigger unsavedChangesAvailable event when unsaved changes exist for loaded map', function () {
		autoSave.addEventListener('unsavedChangesAvailable', unsavedChangesAvailableListener);
		storage.setItem('auto-save-mapId', 'existing events');

		mapRepository.dispatchEvent('mapLoaded', idea, 'mapId');

		expect(unsavedChangesAvailableListener).toHaveBeenCalledWith('mapId');
	});
	it('should not trigger unsavedChangesAvailable when no local changes exist', function () {
		autoSave.addEventListener('unsavedChangesAvailable', unsavedChangesAvailableListener);

		mapRepository.dispatchEvent('mapLoaded', idea, 'mapId');

		expect(unsavedChangesAvailableListener).not.toHaveBeenCalled();
	});
	it('should cache all change events to storage until map is saved', function () {
		var changeCmd = 'updateTitle',
			changeArgs = [1, 'new'];
		mapRepository.dispatchEvent('mapLoaded', idea, 'mapId');
		spyOn(storage, 'setItem');

		idea.dispatchEvent('changed', changeCmd, changeArgs);

		expect(storage.setItem).toHaveBeenCalledWith('auto-save-mapId', [ {cmd: 'updateTitle', args: [1, 'new']} ]);
	});
	it('should append multiple change events to storage', function () {
		mapRepository.dispatchEvent('mapLoaded', idea, 'mapId');
		spyOn(storage, 'setItem');

		idea.dispatchEvent('changed', 'cmd1', [1]);
		idea.dispatchEvent('changed', 'cmd2', [2]);

		expect(storage.setItem).toHaveBeenCalledWith('auto-save-mapId', [ {cmd: 'cmd1', args: [1]}, {cmd: 'cmd2', args: [2]} ]);
	});
});
