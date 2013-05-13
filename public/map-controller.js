/*global _, jQuery, MAPJS, MM, observable, XMLHttpRequest*/
MM.MapController = function (adapters) {
	// order of adapters is important, the first adapter is default
	'use strict';
	observable(this);
	var dispatchEvent = this.dispatchEvent,
		mapLoadingConfirmationRequired,
		mapInfo = {},
		chooseAdapter = function (identifiers) {
			// order of identifiers is important, the first identifier takes precedence
			var idIndex, adapterIndex;
			for (idIndex = 0; idIndex < identifiers.length; idIndex++) {
				for (adapterIndex = 0; adapterIndex < adapters.length; adapterIndex++) {
					if (adapters[adapterIndex].recognises(identifiers[idIndex])) {
						return adapters[adapterIndex];
					}
				}
			}
			return adapters[0];
		},
		mapLoaded = function (idea, mapId, notSharable, readOnly) {
			mapLoadingConfirmationRequired = false;
			idea.addEventListener('changed', function () {
				mapLoadingConfirmationRequired = true;
			});

			mapInfo = {
				idea: idea,
				mapId: (readOnly) ? '' : mapId
			};
			dispatchEvent('mapLoaded', idea, mapId, notSharable);
		};

	this.setMap = mapLoaded;
	this.isMapLoadingConfirmationRequired = function () {
		return mapLoadingConfirmationRequired;
	};
	this.currentMapId = function () {
		return mapInfo && mapInfo.mapId;
	};
	this.loadMap = function (mapId, force) {
		var adapter = chooseAdapter([mapId]),
			progressEvent = function (evt) {
				var done = (evt && evt.loaded) || 0,
					total = (evt && evt.total) || 1,
					message = ((evt && evt.loaded) ? Math.round(100 * done / total) + '%' : evt);
				dispatchEvent('mapLoading', mapId, message);
			},
			mapLoadFailed = function (reason, label) {
				var retryWithDialog = function () {
					dispatchEvent('mapLoading', mapId);
					adapter.loadMap(mapId, true).then(mapLoaded, mapLoadFailed, progressEvent);
				}, adapterName = adapter.description ? ' [' + adapter.description + ']' : '';
				label = label ? label + adapterName : adapterName;
				if (reason === 'no-access-allowed') {
					dispatchEvent('mapLoadingUnAuthorized', mapId, reason);
				} else if (reason === 'failed-authentication') {
					dispatchEvent('authorisationFailed', adapter.description, retryWithDialog);
				} else if (reason === 'not-authenticated') {
					dispatchEvent('authRequired', adapter.description, retryWithDialog);
				} else {
					dispatchEvent('mapLoadingFailed', mapId, reason, label);
				}
			};
		if (!force && mapLoadingConfirmationRequired) {
			dispatchEvent('mapLoadingConfirmationRequired', mapId);
			return;
		}

		dispatchEvent('mapLoading', mapId);
		adapter.loadMap(mapId).then(
			mapLoaded,
			mapLoadFailed,
			progressEvent
		);
	};

	this.publishMap = function (adapterType) {
		var adapter = chooseAdapter([adapterType, mapInfo.mapId]),
			mapSaved = function (savedMapId) {
				var idHasChanged = (mapInfo.mapId !== savedMapId);
				mapLoadingConfirmationRequired = false;
				mapInfo.mapId = savedMapId;
				dispatchEvent('mapSaved', savedMapId, mapInfo.idea, idHasChanged);
			},
			progressEvent = function (evt) {
				var done = (evt && evt.loaded) || 0,
					total = (evt && evt.total) || 1,
					message = ((evt && evt.loaded) ? Math.round(100 * done / total) + '%' : evt);
				dispatchEvent('mapSaving', adapter.description, message);
			},
			mapSaveFailed = function (reason, label) {
				var retryWithDialog = function () {
					dispatchEvent('mapSaving', adapter.description);
					adapter.saveMap(mapInfo.idea, mapInfo.mapId, true).then(mapSaved, mapSaveFailed, progressEvent);
				}, adapterName = adapter.description || '';
				label = label ? label + adapterName : adapterName;
				if (reason === 'no-access-allowed') {
					dispatchEvent('mapSavingUnAuthorized', function () {
						dispatchEvent('mapSaving', adapter.description, 'Creating a new file');
						adapter.saveMap(mapInfo.idea, 'new', true).then(mapSaved, mapSaveFailed, progressEvent);
					});
				} else if (reason === 'failed-authentication') {
					dispatchEvent('authorisationFailed', label, retryWithDialog);
				} else if (reason === 'not-authenticated') {
					dispatchEvent('authRequired', label, retryWithDialog);
				} else {
					dispatchEvent('mapSavingFailed', reason, label);
				}
			};
		dispatchEvent('mapSaving', adapter.description);
		adapter.saveMap(mapInfo.idea, mapInfo.mapId).then(
			mapSaved,
			mapSaveFailed,
			progressEvent
		);
	};
};

MM.MapController.mediation = function (mapController, activityLog, alert, navigation) {
	'use strict';
	MM.MapController.mapLocationChange(mapController, navigation);
	MM.MapController.activityTracking(mapController, activityLog);
	MM.MapController.alerts(mapController, alert, navigation);
	MM.MapController.toolbarAndUnsavedChangesDialogue(mapController, activityLog, navigation);
	mapController.loadMap(navigation.currentMapId());
};


MM.MapController.activityTracking = function (mapController, activityLog) {
	'use strict';
	var startedFromNew = function (idea) {
		return idea.id === 1;
	},
		isNodeRelevant = function (ideaNode) {
			return ideaNode.title && ideaNode.title.search(/MindMup|Lancelot|cunning|brilliant|Press Space|famous|Luke|daddy/) === -1;
		},
		isNodeIrrelevant = function (ideaNode) {
			return !isNodeRelevant(ideaNode);
		},
		isMapRelevant = function (idea) {
			return startedFromNew(idea) && idea.find(isNodeRelevant).length > 5 && idea.find(isNodeIrrelevant).length < 3;
		},
		wasRelevantOnLoad;
	mapController.addEventListener('mapLoading', function (mapUrl, percentDone) {
		activityLog.log('loading map [' + mapUrl + '] (' + percentDone + '%)');
	});
	mapController.addEventListener('mapLoaded', function (idea, mapId) {
		activityLog.log('Map', 'View', mapId);
		wasRelevantOnLoad = isMapRelevant(idea);
	});
	mapController.addEventListener('mapLoadingFailed', function (mapUrl, reason, label) {
		var message = 'Error loading map document [' + mapUrl + '] ' + JSON.stringify(reason);
		if (label) {
			message = message + ' label [' + label + ']';
		}
		activityLog.error(message);
	});
	mapController.addEventListener('mapSaving', activityLog.log.bind(activityLog, 'Map', 'Save Attempted'));
	mapController.addEventListener('mapSaved', function (id, idea) {
		if (isMapRelevant(idea) && !wasRelevantOnLoad) {
			activityLog.log('Map', 'Created Relevant', id);
		} else if (wasRelevantOnLoad) {
			activityLog.log('Map', 'Saved Relevant', id);
		} else {
			activityLog.log('Map', 'Saved Irrelevant', id);
		}
	});
	mapController.addEventListener('mapSavingFailed', function (reason, repositoryName) {
		activityLog.error('Map save failed (' + repositoryName + ')' + JSON.stringify(reason));
	});
	mapController.addEventListener('networkError', function (reason) {
		activityLog.log('Map', 'networkError', JSON.stringify(reason));
	});
};
MM.MapController.alerts = function (mapController, alert, navigation) {
	'use strict';
	var alertId,
		showAlertWithCallBack = function (message, prompt, type, callback) {
			alert.hide(alertId);
			alertId = alert.show(
				message,
				'<a href="#" data-mm-role="auth">' + prompt + '</a>',
				type
			);
			jQuery('[data-mm-role=auth]').click(function () {
				alert.hide(alertId);
				callback();
			});
		},
		showErrorAlert = function (title, message) {
			alert.hide(alertId);
			alertId = alert.show(title, message, 'error');
		};
	navigation.addEventListener('mapIdChangeConfirmationRequired', function (newMapId) {
		showAlertWithCallBack(
			'There are unsaved changes in the loaded map.',
			'Click here to continue',
			'warning',
			function () {
				navigation.confirmationRequired(false);
				navigation.changeMapId(newMapId);
			}
		);
	});
	mapController.addEventListener('mapLoading', function (mapUrl, progressMessage) {
		alert.hide(alertId);
		alertId = alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Please wait, loading the map...', (progressMessage || ''));
	});
	mapController.addEventListener('mapSaving', function (repositoryName, progressMessage) {
		alert.hide(alertId);
		alertId = alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Please wait, saving the map...', (progressMessage || ''));
	});
	mapController.addEventListener('authRequired', function (providerName, authCallback) {
		showAlertWithCallBack(
			'This operation requires authentication through ' + providerName + ' !',
			'Click here to authenticate',
			'warning',
			authCallback
		);
	});
	mapController.addEventListener('mapSaved', function () {
		alert.hide(alertId);
	});
	mapController.addEventListener('mapLoaded', function () {
		alert.hide(alertId);
	});
	mapController.addEventListener('authorisationFailed', function (providerName, authCallback) {
		showAlertWithCallBack(
			'We were unable to authenticate with ' + providerName,
			'Click here to try again',
			'warning',
			authCallback
		);
	});
	mapController.addEventListener('mapLoadingUnAuthorized', function () {
		showErrorAlert('The map could not be loaded.', 'You do not have the right to view this map');
	});
	mapController.addEventListener('mapSavingUnAuthorized', function (callback) {
		showAlertWithCallBack(
			'You do not have the right to edit this map',
			'Click here to save a copy',
			'error',
			callback
		);
	});
	mapController.addEventListener('mapLoadingFailed', function () {
		showErrorAlert('Unfortunately, there was a problem loading the map.', 'An automated error report was sent and we will look into this as soon as possible');
	});
	mapController.addEventListener('mapSavingFailed', function (reason, label, callback) {
		var messages = {
			'file-too-large': ['Unfortunately, the file is too large for the selected storage provider.', 'Please select a different storage provider from the save dropdown menu'],
			'network-error': ['There was a network problem communicating with the server.', 'Please try again later. Don\'t worry, you have an auto-saved version in this browser profile that will be loaded the next time you open the map']
		},
			message = messages[reason] || ['Unfortunately, there was a problem saving the map.', 'Please try again later. We have sent an error report and we will look into this as soon as possible'];
		if (callback) {
			showAlertWithCallBack(message[0], message[1], 'warning', callback);
		} else {
			showErrorAlert(message[0], message[1]);
		}
	});
};
MM.MapController.toolbarAndUnsavedChangesDialogue = function (mapController, activityLog, navigation) {
	'use strict';
	var changed, saving, mapLoaded,
		setNotSharable = function (notSharable) {
			if (notSharable) {
				jQuery('body').removeClass('map-sharable').addClass('map-not-sharable');
			} else {
				jQuery('body').removeClass('map-not-sharable').addClass('map-sharable');
			}
		},
		toggleChange = function () {
			saving = false;
			if (!changed) {
				jQuery('body').removeClass('map-unchanged').addClass('map-changed');
				activityLog.log('Map', 'Edit');
				navigation.confirmationRequired(true);
				changed = true;
			}
		};
	mapController.addEventListener('mapLoaded', function (idea, mapId, notSharable) {
		jQuery('body').removeClass('map-changed').addClass('map-unchanged');
		changed = false;
		navigation.confirmationRequired(false);
		setNotSharable(notSharable);
		if (!mapLoaded) {
			jQuery(window).bind('beforeunload', function () {
				if (changed && !saving) {
					return 'There are unsaved changes.';
				}
			});
			mapLoaded = true;
		}
		if (!mapId || mapId.length < 3) { /* imported, no repository ID */
			toggleChange();
		}
		idea.addEventListener('changed', function (command, args) {
			toggleChange();
			activityLog.log(['Map', command].concat(args));
		});
	});
	mapController.addEventListener('mapSaving', function () {
		saving = true;
	});
	mapController.addEventListener('mapSaved', function () {
		saving = false;
		changed = false;
		navigation.confirmationRequired(false);
		jQuery('body').removeClass('map-changed').addClass('map-unchanged');
	});
};
MM.MapController.mapLocationChange = function (mapController, navigation) {
	'use strict';
	mapController.addEventListener('mapLoaded', function (idea, newMapId) {
		navigation.changeMapId(newMapId || 'nil', true);
	});
	mapController.addEventListener('mapSaved', function (newMapId, idea, idHasChanged) {
		if (idHasChanged) {
			navigation.changeMapId(newMapId || 'nil', true);
		}
	});
	navigation.addEventListener('mapIdChanged', function (newMapId) {
		if (!newMapId || newMapId === 'nil') {
			return;
		}
		var mapId = mapController.currentMapId();
		if (!mapId || mapId !== newMapId) {
			mapController.loadMap(newMapId);
		}
	});
};
(function () {
	'use strict';
	var oldXHR = jQuery.ajaxSettings.xhr.bind(jQuery.ajaxSettings);
	jQuery.ajaxSettings.xhr = function () {
		var xhr = oldXHR();
		if (xhr instanceof XMLHttpRequest) {
			xhr.addEventListener('progress', this.progress, false);
		}
		if (xhr.upload) {
			xhr.upload.addEventListener('progress', this.progress, false);
		}
		return xhr;
	};
}());
