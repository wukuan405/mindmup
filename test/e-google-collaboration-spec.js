/* global jasmine, it, describe, beforeEach, afterEach, MM, observable, expect, jQuery, gapi, spyOn, window */
MM.FakeGoogleRealtime = function () {
	'use strict';
	var self = observable(this);
	self.collaborators = [];
	self.model = {};
	self.close = jasmine.createSpy('close');
	self.getCollaborators = function () {
		return self.collaborators;
	};
	self.getModel = function () {
		return {
			getRoot: function () {
				return {
					get: function (property) {
						if (!self.model[property]) {
							self.model[property] = observable({});
						}
						return self.model[property];
					}
				};
			}
		};
	};
};
MM.FakeDriveConstants = {
	drive: {
		realtime: {
			EventType: {
				VALUES_ADDED: 'values_added',
				VALUE_CHANGED: 'value_changed',
				COLLABORATOR_LEFT: 'collaborator_left',
				COLLABORATOR_JOINED: 'collaborator_joined'
			}
		}
	}
};
describe('MM.RealtimeGoogleDocumentMediator', function () {
	'use strict';
	var googleDoc, collaborationModel, mapController, mindmupMapId, unloadNotifier, sessions, remoteCollaborator, remoteGoogleCollaborator,
			myGoogleCollaborator, underTest;
	beforeEach(function () {
		window.gapi = MM.FakeDriveConstants;
		mindmupMapId = 'new-map-id';
		unloadNotifier = jQuery('<div>').appendTo('body');
		collaborationModel = observable(jasmine.createSpyObj('collaborationModel', ['start', 'stop', 'collaboratorPresenceChanged', 'collaboratorFocusChanged']));
		mapController = observable({});
		googleDoc = new MM.FakeGoogleRealtime();
		sessions = {'remote session 1': 'node.1234', 'old remote session': 'node.111'};
		remoteGoogleCollaborator = { userId: 'someone remote', sessionId: 'remote session 1', photoUrl: 'photo2', displayName: 'Someone else', color: '#777'};
		var remoteGoogleCollaboratorGhost = { userId: 'someone remote', sessionId: 'old remote session', photoUrl: 'photo2', displayName: 'Someone else'};
		myGoogleCollaborator = { userId: 'it is me', isMe: true, sessionId: 'my session id', photoUrl: 'photo1', displayName: 'Me'};
		googleDoc.collaborators = [
				myGoogleCollaborator,
				remoteGoogleCollaborator,
				remoteGoogleCollaboratorGhost
		];
		googleDoc.model.focusNodes = observable({
			get: function (sessionId) {
				return sessions[sessionId];
			},
			set: jasmine.createSpy('set')
		});
		remoteCollaborator = {photoUrl: 'photo2', focusNodeId: 'node.1234', sessionId: 'someone remote', name: 'Someone else', color: '#777'};
	});
	afterEach(function () {
		window.gapi = undefined;
		unloadNotifier.remove();
	});
	describe('initialisation', function () {
		it('starts the collaboration model with initial collaborators from the doc, unique by user Id', function () {

			underTest = new MM.RealtimeGoogleDocumentMediator(googleDoc, collaborationModel, mindmupMapId, mapController, unloadNotifier);

			expect(collaborationModel.start).toHaveBeenCalledWith([remoteCollaborator]);
		});
	});
	describe('state callback requests', function () {
		var spy;
		beforeEach(function () {
			spy = jasmine.createSpy('callback');
			underTest = new MM.RealtimeGoogleDocumentMediator(googleDoc, collaborationModel, mindmupMapId, mapController, unloadNotifier);
		});
		describe('collaboratorRequestedForContentSession', function () {
			it('calls the callback passing in the mm collaborator for the content session (="gd" + google session id)', function () {
				collaborationModel.dispatchEvent('collaboratorRequestedForContentSession', 'gd' + remoteGoogleCollaborator.sessionId, spy);
				expect(spy).toHaveBeenCalledWith(remoteCollaborator);
			});
			it('does not explode if the user cannot be found', function () {
				collaborationModel.dispatchEvent('collaboratorRequestedForContentSession', 'non existent', spy);
				expect(spy).not.toHaveBeenCalled();
			});
			it('does not call the callback if invoked for the current user session', function () {
				collaborationModel.dispatchEvent('collaboratorRequestedForContentSession', 'gd' + myGoogleCollaborator.sessionId, spy);
				expect(spy).not.toHaveBeenCalled();
			});
			it('does not explode if callback is not defined', function () {
				collaborationModel.dispatchEvent('collaboratorRequestedForContentSession', 'gd' + remoteGoogleCollaborator.sessionId);
			});
		});
		describe('sessionFocusRequested', function () {
			it('calls the callback passing in the focus node ID for the collaboration model session (=google user id)', function () {
				collaborationModel.dispatchEvent('sessionFocusRequested', remoteGoogleCollaborator.userId, spy);
				expect(spy).toHaveBeenCalledWith('node.1234');
			});
			it('does not explode if the focus node is not defined for the session', function () {
				sessions[remoteGoogleCollaborator.sessionId] = undefined;
				collaborationModel.dispatchEvent('sessionFocusRequested', remoteGoogleCollaborator.userId, spy);
				expect(spy).not.toHaveBeenCalled();
			});
			it('does not explode if the user ID cannot be found', function () {
				collaborationModel.dispatchEvent('sessionFocusRequested', 'non existent', spy);
				expect(spy).not.toHaveBeenCalled();
			});
			it('does not call the callback if invoked for the current user session', function () {
				sessions[myGoogleCollaborator.sessionId] = 'node.87777';
				collaborationModel.dispatchEvent('sessionFocusRequested', myGoogleCollaborator.userId, spy);
				expect(spy).not.toHaveBeenCalled();
			});
			it('does not explode if callback is not defined', function () {
				collaborationModel.dispatchEvent('sessionFocusRequested', remoteGoogleCollaborator.userId);
			});
		});

	});
	describe('event processing after init', function () {
		beforeEach(function () {
			underTest = new MM.RealtimeGoogleDocumentMediator(googleDoc, collaborationModel, mindmupMapId, mapController, unloadNotifier);
			spyOn(underTest, 'stop').and.callThrough();
		});
		describe('remote notifications', function () {
			it('changes collaborator focus after an event is added to the events queue', function () {
				sessions['remote session 1'] = 'node.444';
				googleDoc.model.events.dispatchEvent(gapi.drive.realtime.EventType.VALUES_ADDED, { sessionId: 'remote session 1' });
				expect(collaborationModel.collaboratorFocusChanged).toHaveBeenCalledWith({photoUrl: 'photo2', focusNodeId: 'node.444', sessionId: 'someone remote', name: 'Someone else', color: '#777'});
			});
			it('changes collaborator focus if the focusnodes map changes', function () {
				sessions['remote session 1'] = 'node.444';
				googleDoc.model.focusNodes.dispatchEvent(gapi.drive.realtime.EventType.VALUE_CHANGED, { sessionId: 'remote session 1' });
				expect(collaborationModel.collaboratorFocusChanged).toHaveBeenCalledWith({photoUrl: 'photo2', focusNodeId: 'node.444', sessionId: 'someone remote', name: 'Someone else', color: '#777'});
			});
			it('changes collaborator presence when a remote collaborator joins', function () {
				googleDoc.dispatchEvent(gapi.drive.realtime.EventType.COLLABORATOR_JOINED, {collaborator: { displayName: 'Zorro', photoUrl: 'http://zorro', userId: 'zorro user', sessionId: 'zorro session', color: '#aaa'}});
				expect(collaborationModel.collaboratorPresenceChanged).toHaveBeenCalledWith({focusNodeId: undefined, name: 'Zorro', photoUrl: 'http://zorro', sessionId: 'zorro user', color: '#aaa'}, true);
			});
			it('changes collaborator presence when a remote collaborator leaves', function () {
				googleDoc.dispatchEvent(gapi.drive.realtime.EventType.COLLABORATOR_LEFT, {collaborator: remoteGoogleCollaborator});
				expect(collaborationModel.collaboratorPresenceChanged).toHaveBeenCalledWith(remoteCollaborator, false);
			});
		});
		describe('ignores local drive realtime notifications', function () {
			it('does not change collaborator focus', function () {
				googleDoc.model.events.dispatchEvent(gapi.drive.realtime.EventType.VALUES_ADDED, { userId: 'it is me', sessionId: 'my session id' });
				googleDoc.model.focusNodes.dispatchEvent(gapi.drive.realtime.EventType.VALUE_CHANGED, {userId: 'it is me', sessionId: 'my session id' });
				expect(collaborationModel.collaboratorFocusChanged).not.toHaveBeenCalled();
			});
			it('does not change the collaborator presence', function () {
				collaborationModel.collaboratorPresenceChanged.calls.reset();
				googleDoc.dispatchEvent(gapi.drive.realtime.EventType.COLLABORATOR_JOINED, {collaborator: myGoogleCollaborator});
				googleDoc.dispatchEvent(gapi.drive.realtime.EventType.COLLABORATOR_LEFT, {collaborator: myGoogleCollaborator});
				expect(collaborationModel.collaboratorPresenceChanged).not.toHaveBeenCalled();
			});
		});
		it('updates focusNodes if local focus changes', function () {
			collaborationModel.dispatchEvent('myFocusChanged', 'node.7777');
			expect(googleDoc.model.focusNodes.set).toHaveBeenCalledWith(myGoogleCollaborator.sessionId, 'node.7777');
		});
		it('ends the google doc session when the map is saved on a different repository', function () {
			mapController.dispatchEvent('mapSaved', 'some other map repo');
			expect(underTest.stop).toHaveBeenCalled();
		});
		it('ends the google doc session when a different map is loaded', function () {
			mapController.dispatchEvent('mapLoaded', 'some other map repo');
			expect(underTest.stop).toHaveBeenCalled();
		});
		it('closes the google doc when the unloadNotifier gets the beforeunload event dispatched', function () {
			unloadNotifier.trigger('beforeunload');
			expect(googleDoc.close).toHaveBeenCalled();
		});
		describe('when stopped', function () {
			it('removes all event listeners', function () {
				underTest.stop();
				expect(googleDoc.model.events.listeners(gapi.drive.realtime.EventType.VALUES_ADDED)).toEqual([]);
				expect(googleDoc.model.focusNodes.listeners(gapi.drive.realtime.EventType.VALUE_CHANGED)).toEqual([]);
				expect(googleDoc.listeners(gapi.drive.realtime.EventType.COLLABORATOR_LEFT)).toEqual([]);
				expect(googleDoc.listeners(gapi.drive.realtime.EventType.COLLABORATOR_JOINED)).toEqual([]);
				expect(collaborationModel.listeners('myFocusChanged')).toEqual([]);
				expect(collaborationModel.listeners('collaboratorRequestedForContentSession')).toEqual([]);
				expect(collaborationModel.listeners('sessionFocusRequested')).toEqual([]);
				expect(mapController.listeners('mapLoaded')).toEqual([]);
				expect(mapController.listeners('mapSaved')).toEqual([]);
			});
			it('stops the collaboration model', function () {
				underTest.stop();
				expect(collaborationModel.stop).toHaveBeenCalled();
			});
			it('closes the document', function () {
				underTest.stop();
				expect(googleDoc.close).toHaveBeenCalled();
			});
			it('no longer tries to close the doc on unload notifications', function () {
				underTest.stop();
				googleDoc.close.calls.reset();
				unloadNotifier.trigger('beforeunload');
				expect(googleDoc.close).not.toHaveBeenCalled();
			});
		});
	});
});
