/*global $, jQuery, MM, document*/
jQuery.fn.remoteExportWidget = function (mapRepository, pngExporter, alert) {
	'use strict';
	var self = this,
		loadedIdea,
		downloadLink = (document.createElement('a').hasOwnProperty('download')) ? $('<a>').addClass('hide').appendTo('body') : undefined,
		joinLines = function (string) {
			return string.replace(/\n/g, ' ').replace(/\r/g, ' ');
		};
	mapRepository.addEventListener('mapLoaded', function (idea) {
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
					if (alert && alertId) {
						alert.hide(alertId);
						alertId = undefined;
					}
					if (downloadLink && (!$('body').hasClass('force-remote'))) {
						downloadLink.attr('download', title);
						if (window.Blob && window.webkitURL && window.webkitURL.createObjectURL) {
							var blob = new Blob([contents], {type: 'text/html'});
							downloadLink.attr('href', window.webkitURL.createObjectURL(blob));
						} else {
							downloadLink.attr('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
						}
						downloadLink[0].click();
						return false;
					} else {
						delete self.download;
						exportForm.find('[name=title]').val(joinLines(title));
						exportForm.find('[name=map]').val(contents);
						exportForm.submit();
						return false;
					}
				}
			);
		}
	});
};
