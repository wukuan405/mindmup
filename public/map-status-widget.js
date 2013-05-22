/*global jQuery, window*/
jQuery.fn.mapStatusWidget = function (mapController) {
	'use strict';
	var element = this,
		oldIdea,
		updateSharable = function () {
			if (!mapController.isMapSharable()) {
				element.removeClass('map-sharable').addClass('map-not-sharable');
			} else {
				element.removeClass('map-not-sharable').addClass('map-sharable');
			}
		},
		rebindIfChanged = function (idea) {
			if (oldIdea !== idea) {
				oldIdea = idea;
				if (!mapController.isMapAutoSaved()) {
					idea.addEventListener('changed', function () {
						if (element.hasClass('map-unchanged')) {
							element.removeClass('map-unchanged').addClass('map-changed');
							element.removeClass('map-sharable').addClass('map-not-sharable');
						}

					});
				}
			}
		};
	mapController.addEventListener('mapSaved mapLoaded', function (mapId, idea) {
		if (!mapId || mapId.length < 3) { /* imported, no repository ID */
			jQuery('body').removeClass('map-unchanged').addClass('map-changed');
		} else {
			element.removeClass('map-changed').addClass('map-unchanged');
		}
		rebindIfChanged(idea);
		updateSharable();
	});
	jQuery(window).bind('beforeunload', function () {
		if (mapController.isMapLoadingConfirmationRequired()) {
			return 'There are unsaved changes.';
		}
	});
};
