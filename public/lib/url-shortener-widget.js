/*global MM, jQuery, setTimeout, observable */
MM.GoogleUrlShortenerController = function (googleShortenerApiKey, activityLog, mapController, baseUrl) {
    'use strict';
	var	shortenerRetriesLeft,
        self = observable(this),
		fireShortener = function (navUrl) {
			if (!navUrl) {
				return;
			}
			jQuery.ajax({
				type: 'post',
				url: 'https://www.googleapis.com/urlshortener/v1/url?key=' + googleShortenerApiKey,
				dataType: 'json',
				contentType: 'application/json',
				data: '{"longUrl": "' + navUrl + '"}'
			}).done(function (result) {
                self.dispatchEvent('urlChanged', result.id);
            }).fail(function (xhr, err, msg) {
                if (shortenerRetriesLeft > 0) {
                    shortenerRetriesLeft--;
                    setTimeout(function() { fireShortener(navUrl); }, 1000);
                } else {
                    activityLog.log('Warning', 'URL shortener failed', err + ' ' + msg);
                }
            });
		},
		previousUrl;
	mapController.addEventListener('mapLoaded mapSaved', function (mapId) {
		var navUrl = baseUrl + mapId;
		if (previousUrl === navUrl) {
			return;
		}
        self.dispatchEvent('urlChanged', navUrl);
		previousUrl = navUrl;
        shortenerRetriesLeft = 5;
		fireShortener(navUrl);
	});
};
jQuery.fn.urlShortenerWidget = function (urlShortenerController) {
	'use strict';
	var element = this;

    element.filter('input').on('input', function () {
            var element = jQuery(this);
            element.val(element.data('mm-url'));
        }).click(function () {
            if (this.setSelectionRange) {
                this.setSelectionRange(0, this.value.length);
            } else if (this.select) {
                this.select();
            }
            return false;
        }).hide();
    urlShortenerController.addEventListener('urlChanged', function (newUrl) {
        element.val(newUrl).data('mm-url', newUrl);
        if (newUrl) {
            element.filter('input').show();
        } else {
            element.filter('input').hide();
        }
    });
	return element;
};
