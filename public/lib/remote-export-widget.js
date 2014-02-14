/*global $, jQuery, MM, document, MAPJS, window, atob, ArrayBuffer, Uint8Array*/
jQuery.fn.remoteExportWidget = function (mapController, alert, measureModel, configurationGenerator, storageApi) {
	'use strict';
	var loadedIdea,
		downloadLink = ('download' in document.createElement('a')) ? $('<a>').addClass('hide').appendTo('body') : undefined,
		dataUriToBlob = function (dataURI) {
			var byteString = atob(dataURI.split(',')[1]),
				mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0],
				ab = new ArrayBuffer(byteString.length),
				ia = new Uint8Array(ab),
				i;
			for (i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			return new window.Blob([ab], {type: mimeString});
		},
		toObjectURL = function (contents, mimeType) {
			var browserUrl = window.URL || window.webkitURL;
			if (/^data:[a-z]*\/[a-z]*/.test(contents)) {
				return browserUrl.createObjectURL(dataUriToBlob(contents));
			}
			return browserUrl.createObjectURL(new window.Blob([contents], {type: mimeType}));
		};
	mapController.addEventListener('mapLoaded', function (mapId, idea) {
		loadedIdea = idea;
	});
	return this.click(function () {
		var toPromise = function (fn, mimeType) {
				return function () {
					return jQuery.Deferred().resolve(fn.apply(undefined, arguments), mimeType).promise();
				};
			},
			exportFunctions = {
				'mup' : toPromise(function (contentObject) { return JSON.stringify(contentObject, null, 2); }, 'application/json'),
				'mm' : toPromise(MM.freemindExport, 'text/xml'),
				'html': MM.exportToHtmlDocument,
				'png': MAPJS.pngExport,
				'txt': toPromise(MM.exportIdeas.bind({}, loadedIdea, new MM.TabSeparatedTextExporter()), 'text/plain'),
				'measures': toPromise(function () {
						return MM.exportTableToText(measureModel.getRawData());
					}, 'text/tab-separated-values')
			},
			format = $(this).data('mm-format'),
			extension = $(this).data('mm-extension') || format,
			title,
			elem,
			alertId;
		title = loadedIdea.title + '.' + extension;
		if (alert) {
			alertId = alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Exporting map to ' + title, 'This may take a few seconds for larger maps', 'info');
		}
		elem = $(this);
		if (exportFunctions[format]) {
			exportFunctions[format](loadedIdea).then(
				function (contents, mimeType) {
					var toSend = contents;
					if (!toSend) {
						return false;
					}
					if (alert && alertId) {
						alert.hide(alertId);
						alertId = undefined;
					}
					if (downloadLink && (!$('body').hasClass('force-remote'))) {
						downloadLink.attr('download', title).attr('href', toObjectURL(toSend, mimeType));
						downloadLink[0].click();
					} else {
						if (/^data:[a-z]*\/[a-z]*/.test(toSend)) {
							toSend = dataUriToBlob(toSend);
							mimeType = toSend.type;
						}
						configurationGenerator.generateEchoConfiguration(extension, mimeType).then(
							function (exportConfig) {
								storageApi.save(toSend, exportConfig, {isPrivate: true}).then(
									function () {
										alertId = alert.show('Your map was exported.',
											' <a href="' + exportConfig.signedOutputUrl + '" target="_blank">Click here to download it</a>',
											'success');
									});
							});
					}
				}
			);
		}
	});
};
