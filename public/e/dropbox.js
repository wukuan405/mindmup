/*global MM, window, jQuery, $ */
MM.Extensions.DropBox = function () {
	'use strict';
	var mapController = MM.Extensions.components.mapController,
		DropBoxFileSystem = function (appKey) {
			var self = this;
			self.loadMap = function () {
				return jQuery.Deferred().reject('not implemented').promise();
			};
			self.saveMap = function () {
				return jQuery.Deferred().reject('not implemented').promise();
			};
			self.recognises = function (mapId) {
				return mapId && (/^d/).test(mapId);
			};
			self.prefix = 'd';
			self.description = 'DropBox';
		},
		fileSystem = new DropBoxFileSystem(MM.Extensions.mmConfig.dropboxAppKey),
		loadUI = function (html) {
			var dom = $(html);
			$('[data-mm-role=save] ul').append(dom.find('[data-mm-role=save-link]').clone());
			$('ul[data-mm-role=save]').append(dom.find('[data-mm-role=save-link]').clone());
			$('[data-mm-role=open-sources]').prepend(dom.find('[data-mm-role=open-link]'));
			$('[data-mm-role=new-sources]').prepend(dom.find('[data-mm-role=new-link]'));
			$('[data-mm-role=sharelinks]').prepend(dom.find('[data-mm-role=sharelinks]').children());
			mapController.validMapSourcePrefixesForSaving += fileSystem.prefix;
		};
	mapController.addMapSource(new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(fileSystem)));
	$.get('/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/dropbox.html', loadUI);
	$('<link rel="stylesheet" href="/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/dropbox.css" />').appendTo($('body'));
};
if (!window.jasmine) {
	MM.Extensions.DropBox();
}
