/*global $, jQuery, MM, document*/
jQuery.fn.remoteExportWidget = function (mapRepository, pngExporter, alert) {
	'use strict';
	var self = this,
		loadedIdea,
		downloadLink = (document.createElement('a').hasOwnProperty('download')) ? $('<a>').addClass('hide').appendTo('body') : undefined;
	mapRepository.addEventListener('mapLoaded', function (idea) {
		console.log('mapLoaded', idea.title);
		loadedIdea = idea;
	});
	return this.click(function () {
		var exportForm = $($(this).data('mm-target')),
			exportFunc = function (fn, isPromise) {
				if (isPromise) {
					return fn;
				}
				return function () {
					return jQuery.Deferred().resolve(fn.apply(undefined, arguments)).promise();
				};
			},
			exportFunctions = {
				'mup' : exportFunc(JSON.stringify, false),
				'mm' : exportFunc(MM.freemindExport, false),
				'html': exportFunc(MM.exportToHtmlDocument.bind({}, pngExporter), true),
				'txt': exportFunc(MM.exportIdeas.bind({}, loadedIdea, new MM.TabSeparatedTextExporter()), false)
			},
			format = $(this).data('mm-format'),
		    title,
		    elem,
		    alertId;
		title = loadedIdea.title + '.' + format;
		if (alert) {
			alertId = alert.show('Exporting map to ' + title, 'This may take a few seconds for larger maps', 'info');
		}
		elem = $(this);
		if (exportFunctions[format]) {
			exportFunctions[format](loadedIdea).then(
				function (contents) {
					if (!contents) {
						return false;
					}
					console.log('loadedIdea.title', loadedIdea.title, 'elem', elem);
					if (alert && alertId) {
						alert.hide(alertId);
						alertId = undefined;
					}
					if (downloadLink && (!$('body').hasClass('force-remote'))) {
						downloadLink.attr('download', title);
						downloadLink.attr('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
						downloadLink[0].click();
						return false;
					} else {
						elem.attr('href', '#');
						delete self.download;
						exportForm.find('[name=title]').val(title);
						exportForm.find('[name=map]').val(contents);
						exportForm.submit();
					}

				}
			);
		}
	});
};
