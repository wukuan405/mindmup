/*global MM, window, jQuery, $, Dropbox */
MM.Extensions.DropBox = function () {
	'use strict';
	var mapController = MM.Extensions.components.mapController,
		DropBoxFileSystem = function (appKey) {
			var self = this,
				client,
				popupWindowLoginLauncher = function () {
					var context = {},
						deferred = jQuery.Deferred(),
						popupFrame = window.open('/dropbox', '_blank', 'height=400,width=700,location=no,menubar=no,resizable=yes,status=no,toolbar=no'),
						onMessage = function (message) {
							if (message && message.dropbox_credentials) {
								deferred.resolve(message.dropbox_credentials);
							} else if (message && message.dropbox_error) {
								deferred.reject('failed-authentication', message.dropbox_error);
							}
						},
						checkClosed = function () {
							if (popupFrame.closed) {
								deferred.reject('user-cancel');
							}
						},
						interval = window.setInterval(checkClosed, 200);
					deferred.always(function () {
						window.MMDropboxCallBack = undefined;
						window.clearInterval(interval);
					});
					/* don't do window.addListener here as it's not deterministic if that or window.close will get to us first */
					window.MMDropboxCallBack = onMessage;
					return deferred.promise();
				},
				makeReady = function (showAuthenticationDialogs) {
					var result = jQuery.Deferred();
					if (!client) {
						if (Dropbox && Dropbox.Client) {
							result.notify('Initializing Dropbox');
							client = new Dropbox.Client({key: appKey});
						} else {
							result.reject('Dropbox API not loaded');
						}
					}
					if (client.isAuthenticated()) {
						result.resolve();
					} else {
						client.reset();
						result.notify('Authenticating with Dropbox');
						if (!showAuthenticationDialogs) {
							client.authenticate({interactive: false}, function (dropboxError) {
								if (dropboxError || !client.isAuthenticated()) {
									result.reject('not-authenticated');
								} else {
									result.resolve();
								}
							});
						} else {
							popupWindowLoginLauncher().then(
								function (credentials) {
									client.setCredentials(credentials);
								},
								result.reject,
								result.notify
							);
						}
					}
					return result.promise();
				};
			self.loadMap = function () {
				return jQuery.Deferred().reject('not implemented').promise();
			};
			self.saveMap = function (contentToSave, mapId, fileName, showAuthenticationDialogs) {
				var result = jQuery.Deferred();
				makeReady(showAuthenticationDialogs).then(result.resolve, result.reject, result.notify);
				return result.promise();
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
