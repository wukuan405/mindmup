/*global jasmine, describe, it, expect, beforeEach, MM, observable*/
describe('Collaboration Model', function () {
	'use strict';
	var underTest,mapModel, collaboratorFocusChangedListener, collaboratorPresenceChangedListener, myFocusChangedListener;
	beforeEach(function () {
		collaboratorFocusChangedListener = jasmine.createSpy('collaboratorFocusChanged');
		collaboratorPresenceChangedListener = jasmine.createSpy('collaboratorPresenceChanged');
		myFocusChangedListener = jasmine.createSpy('myFocusChanged');
		mapModel = observable(jasmine.createSpyObj('mapModel', ['selectNode']));
    underTest = new MM.CollaborationModel(mapModel);
		underTest.addEventListener('collaboratorFocusChanged', collaboratorFocusChangedListener);
		underTest.addEventListener('collaboratorPresenceChanged', collaboratorPresenceChangedListener);
		underTest.addEventListener('myFocusChanged', myFocusChangedListener);
	});
	describe('collaboratorPresenceChanged', function () {
		beforeEach(function () {
			underTest.start();
			collaboratorPresenceChangedListener.calls.reset();
		});
		it('dispatches collaborator presence events when the API fires them', function () {
			underTest.collaboratorPresenceChanged({sessionId: 123, name: 'Zeka'}, true);
			underTest.collaboratorPresenceChanged({sessionId: 125, name: 'Toma'}, false);

			expect(collaboratorPresenceChangedListener).toHaveBeenCalledWith({sessionId: 123, name: 'Zeka'}, true);
			expect(collaboratorPresenceChangedListener).toHaveBeenCalledWith({sessionId: 125, name: 'Toma'}, false);
		});
		it('does not forward events when stopped', function () {
			collaboratorPresenceChangedListener.calls.reset();
			underTest.stop();

			underTest.collaboratorPresenceChanged({sessionId: 123, focusNodeId: '456'}, true);
			expect(collaboratorPresenceChangedListener).not.toHaveBeenCalled();
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
	describe('Following a collaborator', function () {
		beforeEach(function () {
			underTest.start();
		});
		it('does not follow by default', function () {
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});
			underTest.collaboratorFocusChanged({sessionId: 567, focusNodeId: '422'});
			expect(mapModel.selectNode).not.toHaveBeenCalled();
		});
		it('starts following with toggleFollow', function () {
			underTest.toggleFollow(123);
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});

			expect(mapModel.selectNode).toHaveBeenCalledWith('456');
		});
		it('dispatches follow events only for the session which is followed', function () {
			underTest.toggleFollow(123);
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '123'});
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '789'});

			expect(mapModel.selectNode).toHaveBeenCalledWith('456');
		});
		it('follows someone else with if subsequent toggleFollow is for a different session ID', function () {
			underTest.toggleFollow(123);
			underTest.toggleFollow(567);
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});
			underTest.collaboratorFocusChanged({sessionId: 567, focusNodeId: '422'});
			expect(mapModel.selectNode).toHaveBeenCalledWith('422');
		});
		it('stops following if subsequent toggleFollow is for the same session ID', function () {
			underTest.toggleFollow(123);
			underTest.toggleFollow(123);
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});
			underTest.collaboratorFocusChanged({sessionId: 567, focusNodeId: '422'});
			expect(mapModel.selectNode).not.toHaveBeenCalled();
		});
		it('stops following when stopped', function () {
			underTest.toggleFollow(123);
			underTest.stop();
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});

			expect(mapModel.selectNode).not.toHaveBeenCalled();

		});
		it('does not automatically resume following after stopping and restarting', function () {
			underTest.toggleFollow(123);
			underTest.stop();
			underTest.start();
			underTest.collaboratorFocusChanged({sessionId: 123, focusNodeId: '456'});

			expect(mapModel.selectNode).not.toHaveBeenCalled();
		});
		describe('followedCollaboratorChanged event', function () {
			var listener;

			beforeEach(function () {
				listener = jasmine.createSpy('followedCollaboratorChanged');
				underTest.addEventListener('followedCollaboratorChanged', listener);
			});
			it('dispatches with collaborator session ID when a collaborator is followed changes', function (){
				underTest.toggleFollow(123);
				expect(listener).toHaveBeenCalledWith(123);
			});
			it('dispatches with collaborator session ID when the followed collaborator changes', function (){
				underTest.toggleFollow(123);
				listener.calls.reset();
				underTest.toggleFollow(345);
				expect(listener).toHaveBeenCalledWith(345);
			});
			it('dispatches with undefined when it is no longer following', function () {
				underTest.toggleFollow(123);
				listener.calls.reset();
				underTest.toggleFollow(123);
				expect(listener).toHaveBeenCalledWith(undefined);
			});
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
			beforeEach(function(){
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
