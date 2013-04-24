describe('Auto save', function () {
	it('should trigger unsavedChangesAvailable event when unsaved changes exist for loaded map', function () {
		var storage = MM.jsonStorage(window.localStorage),
			mapRepository = new MM.MapRepository([], storage),
			autoSave = new MM.AutoSave(mapRepository),
			idea = MAPJS.content({}),
			unsavedChangesAvailableListener = jasmine.createSpy('unsavedChangesAvailableListener');
		storage
		autoSave.addEventListener('unsavedChangesAvailable', unsavedChangesAvailableListener);

		mapRepository.dispatchEvent('mapLoaded', idea, 'mapId');

		expect(unsavedChangesAvailableListener).toHaveBeenCalledWith('mapId');
	});
});
