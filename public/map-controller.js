/*global _, jQuery, MAPJS, MM, observable, XMLHttpRequest*/
MM.MapController = function (initialMapSources) {
	// order of mapSources is important, the first mapSource is default
	'use strict';
	observable(this);
	var dispatchEvent = this.dispatchEvent,
		mapLoadingConfirmationRequired,
		mapInfo = {},
		mapSources = [].concat(initialMapSources),
		chooseMapSource = function (identifier) {
			// order of identifiers is important, the first identifier takes precedence
			var mapSourceIndex;
			for (mapSourceIndex = 0; mapSourceIndex < mapSources.length; mapSourceIndex++) {
				if (mapSources[mapSourceIndex].recognises(identifier)) {
					return mapSources[mapSourceIndex];
				}
			}
			return mapSources[0];
		},
		mapLoaded = function (idea, mapId, readOnly) {
			mapLoadingConfirmationRequired = false;
			idea.addEventListener('changed', function () {
				mapLoadingConfirmationRequired = true;
			});

			mapInfo = {
				idea: idea,
				mapId: (readOnly) ? '' : mapId
			};
			dispatchEvent('mapLoaded', idea, mapId);
		};
	this.addMapSource = function (mapSource) {
		mapSources.push(mapSource);
	};
	this.setMap = mapLoaded;
	this.isMapLoadingConfirmationRequired = function () {
		return mapLoadingConfirmationRequired;
	};
	this.currentMapId = function () {
		return mapInfo && mapInfo.mapId;
	};
	this.isMapSharable = function () {
		var mapSource = chooseMapSource(this.currentMapId());
		return mapSource && (!mapSource.notSharable);
	};
	this.loadMap = function (mapId, force) {
		var mapSource = chooseMapSource(mapId),
			progressEvent = function (evt) {
				var done = (evt && evt.loaded) || 0,
					total = (evt && evt.total) || 1,
					message = ((evt && evt.loaded) ? Math.round(100 * done / total) + '%' : evt);
				dispatchEvent('mapLoading', mapId, message);
			},
			mapLoadFailed = function (reason, label) {
				var retryWithDialog = function () {
					dispatchEvent('mapLoading', mapId);
					mapSource.loadMap(mapId, true).then(mapLoaded, mapLoadFailed, progressEvent);
				}, mapSourceName = mapSource.description ? ' [' + mapSource.description + ']' : '';
				label = label ? label + mapSourceName : mapSourceName;
				if (reason === 'no-access-allowed') {
					dispatchEvent('mapLoadingUnAuthorized', mapId, reason);
				} else if (reason === 'failed-authentication') {
					dispatchEvent('authorisationFailed', mapSource.description, retryWithDialog);
				} else if (reason === 'not-authenticated') {
					dispatchEvent('authRequired', mapSource.description, retryWithDialog);
				} else {
					dispatchEvent('mapLoadingFailed', mapId, reason, label);
				}
			};
		if (!force && mapLoadingConfirmationRequired) {
			dispatchEvent('mapLoadingConfirmationRequired', mapId);
			return;
		}
		if (mapId === this.currentMapId()) {
			dispatchEvent('mapLoaded', mapInfo.idea, mapInfo.mapId);
		} else {
			dispatchEvent('mapLoading', mapId);
			mapSource.loadMap(mapId).then(
				mapLoaded,
				mapLoadFailed,
				progressEvent
			);
		}

	};

	this.publishMap = function (mapSourceType) {
		var mapSource = chooseMapSource(mapSourceType || mapInfo.mapId),
			mapSaved = function (savedMapId) {
				mapLoadingConfirmationRequired = false;
				mapInfo.mapId = savedMapId;
				dispatchEvent('mapSaved', savedMapId, mapInfo.idea);
			},
			progressEvent = function (evt) {
				var done = (evt && evt.loaded) || 0,
					total = (evt && evt.total) || 1,
					message = ((evt && evt.loaded) ? Math.round(100 * done / total) + '%' : evt);
				dispatchEvent('mapSaving', mapSource.description, message);
			},
			mapSaveFailed = function (reason, label) {
				var retryWithDialog = function () {
					dispatchEvent('mapSaving', mapSource.description);
					mapSource.saveMap(mapInfo.idea, mapInfo.mapId, true).then(mapSaved, mapSaveFailed, progressEvent);
				}, mapSourceName = mapSource.description || '';
				label = label ? label + mapSourceName : mapSourceName;
				if (reason === 'no-access-allowed') {
					dispatchEvent('mapSavingUnAuthorized', function () {
						dispatchEvent('mapSaving', mapSource.description, 'Creating a new file');
						mapSource.saveMap(mapInfo.idea, 'new', true).then(mapSaved, mapSaveFailed, progressEvent);
					});
				} else if (reason === 'failed-authentication') {
					dispatchEvent('authorisationFailed', label, retryWithDialog);
				} else if (reason === 'not-authenticated') {
					dispatchEvent('authRequired', label, retryWithDialog);
				} else {
					dispatchEvent('mapSavingFailed', reason, label);
				}
			};
		dispatchEvent('mapSaving', mapSource.description);
		mapSource.saveMap(mapInfo.idea, mapInfo.mapId).then(
			mapSaved,
			mapSaveFailed,
			progressEvent
		);
	};
};

MM.MapController.mediation = function (mapController, activityLog, alert) {
	'use strict';
	MM.MapController.activityTracking(mapController, activityLog);
	MM.MapController.alerts(mapController, alert);
	MM.MapController.toolbarAndUnsavedChangesDialogue(mapController, activityLog);	
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
MM.MapController.alerts = function (mapController, alert) {
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
	mapController.addEventListener('mapLoadingConfirmationRequired', function (newMapId) {
		showAlertWithCallBack(
			'There are unsaved changes in the loaded map.',
			'Click here to continue',
			'warning',
			function () {
				mapController.loadMap(newMapId, true);
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
MM.MapController.toolbarAndUnsavedChangesDialogue = function (mapController, activityLog) {
	'use strict';
	var changed, mapLoaded,
		toggleChange = function () {
			if (!changed) {
				jQuery('body').removeClass('map-unchanged').addClass('map-changed');
				activityLog.log('Map', 'Edit');
				changed = true;
			}
		},
		updateSharable = function () {
			if (!mapController.isMapSharable()) {
				jQuery('body').removeClass('map-sharable').addClass('map-not-sharable');
			} else {
				jQuery('body').removeClass('map-not-sharable').addClass('map-sharable');
			}
		};
	mapController.addEventListener('mapLoaded', function (idea, mapId) {
		jQuery('body').removeClass('map-changed').addClass('map-unchanged');
		changed = false;
		if (!mapLoaded) {
			mapLoaded = true;
		}
		if (!mapId || mapId.length < 3) { /* imported, no repository ID */
			toggleChange();
		}
		idea.addEventListener('changed', function (command, args) {
			toggleChange();
			activityLog.log(['Map', command].concat(args));
		});
		updateSharable();
	});
	mapController.addEventListener('mapSaved', function () {
		changed = false;
		jQuery('body').removeClass('map-changed').addClass('map-unchanged');
		updateSharable();
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
