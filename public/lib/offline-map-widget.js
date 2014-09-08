/*global jQuery*/
jQuery.fn.offlineMapWidget = function (mapController) {
    'use strict';
    var self = this;
    mapController.addEventListener('mapIdNotRecognised', function (mapId) {
        if (mapId && mapId[0] === 'o') {
            self.modal('show');
        }
    });
	self.modal({keyboard: true, show: false});
    return this;
};
