/*global jasmine, describe, it, expect, beforeEach, MM, observable*/
describe('Collaboration Model', function () {
	'use strict';
	var underTest, mapModel, collaboratorFocusChangedListener, collaboratorJoinedListener, collaboratorLeftListener, myFocusChangedListener;
	beforeEach(function () {
		collaboratorFocusChangedListener = jasmine.createSpy('collaboratorFocusChanged');
		collaboratorJoinedListener = jasmine.createSpy('collaboratorJoined');
		collaboratorLeftListener = jasmine.createSpy('collaboratorLeft');
		myFocusChangedListener = jasmine.createSpy('myFocusChanged');
		mapModel = observable(jasmine.createSpyObj('mapModel', ['selectNode']));
		underTest = new MM.CollaborationModel(mapModel);
		underTest.addEventListener('collaboratorFocusChanged', collaboratorFocusChangedListener);
		underTest.addEventListener('collaboratorJoined', collaboratorJoinedListener);
		underTest.addEventListener('collaboratorLeft', collaboratorLeftListener);
		underTest.addEventListener('myFocusChanged', myFocusChangedListener);
	});
	describe('collaboratorPresenceChanged', function () {
		beforeEach(function () {
			underTest.start();
			collaboratorJoinedListener.calls.reset();
			collaboratorLeftListener.calls.reset();
		});
		it('dispatches collaborator presence events', function () {
			underTest.collaboratorPresenceChanged({sessionId: 123, name: 'Zeka'}, true);
			underTest.collaboratorPresenceChanged({sessionId: 125, name: 'Toma'}, false);

			expect(collaboratorJoinedListener).toHaveBeenCalledWith({sessionId: 123, name: 'Zeka'}, true);
			expect(collaboratorLeftListener).toHaveBeenCalledWith({sessionId: 125, name: 'Toma'}, false);
		});
		it('does not forward events when stopped', function () {
			collaboratorJoinedListener.calls.reset();
			collaboratorLeftListener.calls.reset();
			underTest.stop();

			underTest.collaboratorPresenceChanged({sessionId: 123, focusNodeId: '456'}, true);
			underTest.collaboratorPresenceChanged({sessionId: 125, name: 'Toma'}, false);
			expect(collaboratorJoinedListener).not.toHaveBeenCalled();
			expect(collaboratorLeftListener).not.toHaveBeenCalled();
		});
	});
	describe('collaboratorFocusChanged', function () {
		it('dispatches initial collaborator focus events when the model is started', function () {
			underTest.start([{photoUrl: 'aaa', focusNodeId: '123.1'}, {photoUrl: 'bbb', focusNodeId: '134.2'}]);
			expect(collaboratorFocusChangedListener.calls.count()).toBe(2);
			expect(collaboratorFocusChangedListener).toHaveBeenCalledWith({photoUrl: 'aaa', focusNodeId: '123.1'});
			expect(collaboratorFocusChangedListener).toHaveBeenCalledWith({photoUrl: 'bbb', focusNodeId: '134.2'});
		});
		it('dispatches additional collaborator focus events when the API fires them', function () {
			underTest.start();
			collaboratorFocusChangedListener.calls.reset();

			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});

			expect(collaboratorFocusChangedListener).toHaveBeenCalledWith({sessionId: 123, focusNodeId: '456'});
		});
		it('does not forward events if not started', function () {
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});
			expect(collaboratorFocusChangedListener).not.toHaveBeenCalled();
		});
		it('does not forward events when stopped', function () {
			underTest.start();
			collaboratorFocusChangedListener.calls.reset();
			underTest.stop();

			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});
			expect(collaboratorFocusChangedListener).not.toHaveBeenCalled();

		});
	});
	describe('focus change notifications', function () {
		describe('before the model is started', function () {
			it('does not send notifications or blow up', function () {
				mapModel.dispatchEvent('nodeSelectionChanged', 242, true);
				expect(myFocusChangedListener).not.toHaveBeenCalled();
			});
		});
		describe('after the model is started', function () {
			beforeEach(function () {
				underTest.start();
			});
			it('notifies the api about a focus change when the mapModel selection changes', function () {
				mapModel.dispatchEvent('nodeSelectionChanged', 242, true);
				expect(myFocusChangedListener).toHaveBeenCalledWith(242);
			});
			it('does not send the focus change notification for unselected nodes', function () {
				mapModel.dispatchEvent('nodeSelectionChanged', 242, false);
				expect(myFocusChangedListener).not.toHaveBeenCalled();
			});
			it('does not send the focus change notification if the model is stopped', function () {
				underTest.stop();
				mapModel.dispatchEvent('nodeSelectionChanged', 242, true);
				expect(myFocusChangedListener).not.toHaveBeenCalled();
			});
		});
	});
	describe('stop', function () {
		var listener;
		beforeEach(function () {
			listener = jasmine.createSpy('stopped');
			underTest.addEventListener('stopped', listener);
		});
		it('does not fire anything if not started', function () {
			underTest.stop();

			expect(listener).toHaveBeenCalled();
		});
		it('fires a stopped event when started', function () {
			underTest.start();
			underTest.stop();

			expect(listener).toHaveBeenCalled();
		});
	});
});
