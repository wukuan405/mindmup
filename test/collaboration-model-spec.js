/*global jasmine, describe, it, expect, beforeEach, MM, observable*/
describe('Collaboration Model', function () {
	'use strict';
	var underTest, api, mapModel, collaboratorFocusChangedListener;
	beforeEach(function () {
		collaboratorFocusChangedListener = jasmine.createSpy('collaboratorFocusChanged');
		api = observable(jasmine.createSpyObj('collaborationApi', ['getCollaborators', 'notifyFocusChanged']));
		mapModel = observable({});
    underTest = new MM.CollaborationModel(mapModel);
		underTest.addEventListener('collaboratorFocusChanged', collaboratorFocusChangedListener);
	});
	describe('collaborator focus events', function () {
		it('dispatches initial collaborator focus events when an API is connected', function () {
			api.getCollaborators.and.returnValue([{photoUrl: 'aaa', focusNodeId: '123.1'}, {photoUrl: 'bbb', focusNodeId: '134.2'}]);
			underTest.connectTo(api);
			expect(collaboratorFocusChangedListener.calls.count()).toBe(2);
			expect(collaboratorFocusChangedListener).toHaveBeenCalledWith({photoUrl: 'aaa', focusNodeId: '123.1'});
			expect(collaboratorFocusChangedListener).toHaveBeenCalledWith({photoUrl: 'bbb', focusNodeId: '134.2'});
		});
	});
	describe('focus change notifications', function () {
		describe('before the model is connected to an API', function () {
			it('does not send notifications or blow up', function () {
				mapModel.dispatchEvent('nodeSelectionChanged', 242, true);
				expect(api.notifyFocusChanged).not.toHaveBeenCalled();
			});
		});
		describe('after the model is connected', function () {
			beforeEach(function(){
				underTest.connectTo(api);
			});
			it('notifies the api about a focus change when the mapModel selection changes', function () {
				mapModel.dispatchEvent('nodeSelectionChanged', 242, true);
				expect(api.notifyFocusChanged).toHaveBeenCalledWith(242);
			});
			it('does not send the focus change notification for unselected nodes', function () {
				mapModel.dispatchEvent('nodeSelectionChanged', 242, false);
				expect(api.notifyFocusChanged).not.toHaveBeenCalled();
			});
			it('does not send the focus change notification if the model is disconnected', function () {
				underTest.disconnect();
				mapModel.dispatchEvent('nodeSelectionChanged', 242, true);
				expect(api.notifyFocusChanged).not.toHaveBeenCalled();
			});
		});
	});
	it('fires a disconnected event when disconnected', function () {
		var listener = jasmine.createSpy('disconnected');
		underTest.addEventListener('disconnected', listener);
		underTest.disconnect();
		expect(listener).toHaveBeenCalled();
	});
});
