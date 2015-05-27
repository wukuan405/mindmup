/*global window, document, observable*/
(function () {
	'use strict';
	var FakeGoogleEvent = function () {
		var self = observable(this);
		self.add = function (listener) {
			self.addEventListener('me', listener);
		};
	};
	window.gapi = {
		hangout : {
			onApiReady: {
				add: function (callback) {
					callback({isApiReady: true});
				}
			},
			onParticipantsRemoved: new FakeGoogleEvent(),
			onParticipantsAdded: new FakeGoogleEvent(),
			getLocalParticipantId: function () {
				return '1';
			},
			getLocalParticipant: function () {
				return {
					id: 1,
					person: {
						id: 1
					}
				};
			},
			getParticipants: function () {
				return [];
			},
			getParticipantById: function () {
				return false;
			},
			data: {
				onStateChanged: new FakeGoogleEvent(),
				onMessageReceived: new FakeGoogleEvent(),
				getStateMetadata: function () {
					return {};
				},
				setValue: function () {
				},
				sendMessage: function () {
				}
			}
		}
	};
	window.gadgets = {
		util: {
			registerOnLoadHandler: function (callback) {
				document.addEventListener('DOMContentLoaded', callback);
			}
		}
	};
})();
