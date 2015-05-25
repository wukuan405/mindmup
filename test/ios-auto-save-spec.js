/* global MM, describe, it, beforeEach, expect, jasmine, observable, observable, jQuery*/

describe('MM.IOS.AutoSave', function () {
	'use strict';
	var underTest, autoSave, confirmationProxy, deferred;
	beforeEach(function () {
		autoSave = observable(jasmine.createSpyObj('autoSave', ['applyUnsavedChanges', 'discardUnsavedChanges']));
		confirmationProxy = jasmine.createSpyObj('confirmationProxy', ['requestConfirmation']);
		deferred = jQuery.Deferred();
		confirmationProxy.requestConfirmation.and.returnValue(deferred.promise());
		underTest = new MM.IOS.AutoSave(autoSave, confirmationProxy);
	});
	it('requests confirmation by default', function () {
		autoSave.dispatchEvent('unsavedChangesAvailable');
		expect(confirmationProxy.requestConfirmation).toHaveBeenCalled();
	});
	describe('when turned off', function () {
		beforeEach(function () {
			underTest.off();
			autoSave.dispatchEvent('unsavedChangesAvailable');
		});
		it('does not request confirmation', function () {
			expect(confirmationProxy.requestConfirmation).not.toHaveBeenCalled();
		});
		it('always discards changes', function () {
			expect(autoSave.discardUnsavedChanges).toHaveBeenCalled();
		});
	});
	describe('when turned on', function () {
		beforeEach(function () {
			underTest.off();
			underTest.on();
			autoSave.dispatchEvent('unsavedChangesAvailable');
		});
		it('requests confirmation', function () {
			autoSave.dispatchEvent('unsavedChangesAvailable');
			expect(confirmationProxy.requestConfirmation).toHaveBeenCalledWith('You have unsaved changes', {'default': 'Apply unsaved changes', 'destructive': 'Discard unsaved changes'}, 'You have made changes to this map that were not saved. Please choose if you would like to apply them or discard them and continue with the saved version');
		});
		it('waits for callback to be resolved', function () {
			expect(autoSave.applyUnsavedChanges).not.toHaveBeenCalled();
			expect(autoSave.discardUnsavedChanges).not.toHaveBeenCalled();
		});
		it('applies unsaved changes if callback is the default', function () {
			deferred.resolve('default');
			expect(autoSave.applyUnsavedChanges).toHaveBeenCalled();
			expect(autoSave.discardUnsavedChanges).not.toHaveBeenCalled();
		});
		it('discard unsaved changes if callback is not the default', function () {
			deferred.resolve('destructive');
			expect(autoSave.applyUnsavedChanges).not.toHaveBeenCalled();
			expect(autoSave.discardUnsavedChanges).toHaveBeenCalled();
		});
	});
});
