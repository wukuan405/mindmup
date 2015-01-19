/* global jQuery, MM */
jQuery.fn.atlasPrepopulationWidget = function (activeContentListener, titleLengthLimit, descriptionLengthLimit, truncFunction, sanitizeFunction) {
	'use strict';
	truncFunction = truncFunction || MM.AtlasUtil.truncate;
	sanitizeFunction = sanitizeFunction || MM.AtlasUtil.sanitize;
	var self = this,
			fillInValues = function () {
				var form = self.find('form[data-mm-role~=atlas-metadata]'),
						idea = activeContentListener.getActiveContent(),
						title = idea && idea.title;
				form.find('[name=title]').attr('placeholder', truncFunction(title, titleLengthLimit));
				form.find('[name=description]').attr('placeholder', truncFunction('MindMup mind map: '+ title, descriptionLengthLimit));
				form.find('[name=slug]').attr('placeholder', sanitizeFunction(truncFunction(title, titleLengthLimit)));
			};
	self.on('show', function (evt) {
		if (this === evt.target) {
			fillInValues();
		}
	});
	return self;
};
MM.AtlasUtil = {
	truncate: function (str, length) { 'use strict'; return str.substring(0, length);},
	sanitize: function (s) {
		'use strict';
		return s.substr(0,100).trim().toLowerCase().replace(/[\\/:*'?"<>|.\n\s]+/g, '_');
	}
};
