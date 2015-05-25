/*global gapi, _, MAPJS, observable, jQuery, window, console */
(function () {
	'use strict';
	var MM = (window.MM = (window.MM || {}));
	MM.Hangouts = {};
	MM.Hangouts.Collaboration = function () {
		var self = this,
				cleanSessionKey = function (string) {
					return string.replace(/[^A-Za-z0-9_-]/g, '_');
				},
				localSessionId = cleanSessionKey(gapi.hangout.getLocalParticipantId()),
				contentAggregate,
				keyIndex = 0,
				applyEvents = function (hangoutEvents, filterOutLocal) {
					_.chain(hangoutEvents).sortBy('timestamp').each(function (hangoutMetadata) {
						var event = JSON.parse(hangoutMetadata.value);
						if (!filterOutLocal || event.sessionId !== localSessionId) {
							contentAggregate.execCommand(event.cmd, event.args, event.sessionId);
						}
					});
				},
				nextKey = function () {
					keyIndex++;
					return localSessionId + '-' + keyIndex;
				},
				sendEvent = function (command, params) {
					gapi.hangout.data.setValue(nextKey(), JSON.stringify({cmd:command, args:params, sessionId: localSessionId}));
				},
				initialising = true,
				duringInitQueue = [],
				initContent = function () {
					contentAggregate = MAPJS.content(_.clone(MM.Maps.default), localSessionId);
					contentAggregate.addEventListener('changed', function (command, params, session) {
						if (session === localSessionId) {
							sendEvent(command, params);
						}
					});
					contentAggregate.addEventListener('resourceStored', function (resourceBody, resourceId, session) {
						if (session === localSessionId) {
							/* TODO: fix this to not use local resource memory */
							sendEvent({cmd: 'storeResource', args: [resourceBody, resourceId]});
						}
					});
					applyEvents(_.values(gapi.hangout.data.getStateMetadata()));
					initialising = false;
					applyEvents(duringInitQueue);
				},
				onStateChange = function (stateMutation) {
					if (!Array.isArray(stateMutation.addedKeys)) {
						return;
					}
					if (initialising) {
						duringInitQueue = duringInitQueue.concat(stateMutation.addedKeys);
					} else {
						applyEvents(stateMutation.addedKeys, true);
					}
				};
		self.getContentAggregate = function () {
			return contentAggregate;
		};
		gapi.hangout.data.onStateChanged.add(onStateChange);
		initContent();
	};
	MM.Hangouts.initMindMup = function () {
		jQuery('#container').empty();
		var isTouch = false,
				getStorage = function () {
					try {
						window.localStorage.setItem('testkey', 'testval');
						if (window.localStorage.getItem('testkey') === 'testval') {
							return window.localStorage;
						}
					} catch (e) {
					}
					return {
						fake: true,
						getItem: function (key) {
							return this[key];
						},
						setItem: function (key, val) {
							this[key] = val;
						},
						removeItem: function (key) {
							delete this[key];
						}
					};
				},
				hangoutsCollaboration = new MM.Hangouts.Collaboration(),
				browserStorage = getStorage(),
				fakeMapController = observable({}),
				alert = new MM.Alert(),
				objectStorage = new MM.JsonStorage(browserStorage),
				activeContentListener = new MM.ActiveContentListener(fakeMapController),
				activeContentResourceManager = new MM.ActiveContentResourceManager(activeContentListener, 'internal'),
				objectClipboard = new MM.LocalStorageClipboard(objectStorage, 'clipboard', alert, activeContentResourceManager),
				mapModel = new MAPJS.MapModel(MAPJS.DOMRender.layoutCalculator, ['Press Space or double-click to edit'], objectClipboard),
				activityLog = console;
		jQuery('#container').domMapWidget(activityLog, mapModel, isTouch, observable({}), jQuery('#container'), activeContentResourceManager.getResource);
		mapModel.setIdea(hangoutsCollaboration.getContentAggregate());
	};
})();
