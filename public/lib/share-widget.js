/*global $,document*/
$.fn.shareWidget = function () {
	'use strict';
	return this.each(function () {
		var self = $(this),
			target = self.attr('data-mm-target');
		if (!target) {
			return;
		}
		self.click(function () {
			var title = encodeURIComponent(document.title),
				url = encodeURIComponent(self.data('mm-url'));
			self.attr('target', '_blank');
			if (target === 'twitter') {
				self.attr('href', 'https://twitter.com/intent/tweet?text=' + title +
					'&url=' + url +
					'&source=mindmup.com&related=mindmup&via=mindmup');
				return true;
			}
			else if (target === 'facebook') {
				self.attr('href', 'https://www.facebook.com/dialog/feed?app_id=621299297886954&' +
					'link=' + url + '&' +
					'name=' + title + '&' +
					'caption=' + encodeURIComponent('Mind map from mindmup.com') + '&' +
					'picture=' + encodeURIComponent('http://static.mindmup.com/img/logo_256.png') + '&' +
					'description=' + title + '&' +
					'redirect_uri=' + encodeURIComponent('http://www.mindmup.com/fb'));
				return true;
			} else if (target === 'email') {
				self.attr('href', 'mailto:?' +
					'subject=' + title + '&' +
					'body=' + encodeURIComponent('Hi,\n\nHere is your mind map:\n\n'+ window.location.href) );
				return true;
			}
			return false;
		});
	});
};
$.fn.googleShareWidget = function (mapController, googleDriveAdapter) {
	'use strict';
	return this.click(function () {
		googleDriveAdapter.showSharingSettings(mapController.currentMapId());
	});
};
