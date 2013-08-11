/*global jasmine, describe, it, beforeEach, afterEach, MM, expect, window, _, spyOn, jQuery */
describe('Dropbox integration', function () {
	'use strict';
	describe('DropboxFileSystem', function () {
		var underTest,
			dropboxApi,
			apiKey = '12345',
			success,
			fail,
			notify,
			fakeDropboxApi;
		beforeEach(function () {
			underTest = new MM.Extensions.Dropbox.DropboxFileSystem(apiKey);
			success = jasmine.createSpy('success');
			fail = jasmine.createSpy('fail');
			notify = jasmine.createSpy('notify');
			fakeDropboxApi = {
				isAuthenticated: jasmine.createSpy('isAuthenticated'),
				reset: jasmine.createSpy('reset'),
				authenticate: jasmine.createSpy('authenticate'),
				readdir: jasmine.createSpy('readdir'),
				readFile: jasmine.createSpy('readFile'),
				writeFile: jasmine.createSpy('writeFile'),
				setCredentials: jasmine.createSpy('setCredentials'),
				Client: function () {
					_.extend(this, fakeDropboxApi);
				}
			};
			window.Dropbox = fakeDropboxApi;
		});
		describe('initialization and authentication', function () {
			var methods = {
				loadMap: {
					exec: function (interactive) { underTest.loadMap('mapId', interactive).then(success, fail, notify); },
					api: 'readFile',
				},
				saveMap: {
					exec: function (interactive) { underTest.saveMap('', 'mapId', '', interactive).then(success, fail, notify); },
					api: 'writeFile',
				},
				listFiles: {
					exec: function (interactive) { underTest.listFiles(interactive, '').then(success, fail, notify); },
					api: 'readdir',
				}
			};
			_.each(methods, function (testMethods, methodName) {
				describe(methodName, function () {
					it('rejects with dropbox api not loaded if the api is missing', function () {
						window.Dropbox = undefined;
						testMethods.exec();
						expect(fail).toHaveBeenCalledWith('Dropbox API not loaded');
						expect(success).not.toHaveBeenCalled();
					});
					it('resets client and attempts immediate auth if not interactive and no session exists', function () {
						testMethods.exec();
						expect(fakeDropboxApi.reset).toHaveBeenCalled();
						expect(fakeDropboxApi.authenticate.callCount).toBe(1);
						expect(fakeDropboxApi.authenticate.calls[0].args[0]).toEqual({interactive: false});
						expect(success).not.toHaveBeenCalled();
						expect(fail).not.toHaveBeenCalled();
					});
					it('rejects with not-authenticated if not interactive and immediate auth fails', function () {
						fakeDropboxApi.authenticate.andCallFake(function (interactive, callback) {
							callback('dropbox error');
						});
						testMethods.exec();
						expect(fail).toHaveBeenCalledWith('not-authenticated');
					});
					it('rejects with not-authenticated if not interactive and immediate auth completes without the client being authenticated', function () {
						fakeDropboxApi.authenticate.andCallFake(function (interactive, callback) {
							callback();
						});
						testMethods.exec();
						expect(fail).toHaveBeenCalledWith('not-authenticated');
					});
					it('launches the popup login if interactive and not authenticated, propagating failures', function () {
						spyOn(MM.Extensions.Dropbox, 'popupLogin').andCallFake(function () {
							return jQuery.Deferred().reject('user-cancel').promise();
						});
						testMethods.exec(true);
						expect(MM.Extensions.Dropbox.popupLogin).toHaveBeenCalled();
						expect(fail).toHaveBeenCalledWith('user-cancel');
					});
					it('propagates to the appropriate API call if client exists and is authenticated', function () {
						fakeDropboxApi.isAuthenticated.andReturn(true);
						testMethods.exec();
						expect(fail).not.toHaveBeenCalled();
						expect(success).not.toHaveBeenCalled();
						expect(fakeDropboxApi[testMethods.api]).toHaveBeenCalled();
					});
					it('propagates to the appropriate API call if client exists and is not authenticated, but authenticates immediately if non interactive', function () {
						fakeDropboxApi.authenticate.andCallFake(function (interactive, callback) {
							fakeDropboxApi.isAuthenticated.reset();
							fakeDropboxApi.isAuthenticated.andReturn(true);
							callback();
						});
						testMethods.exec();
						expect(fail).not.toHaveBeenCalled();
						expect(success).not.toHaveBeenCalled();
						expect(fakeDropboxApi[testMethods.api]).toHaveBeenCalled();
					});
					it('propagates to the appropriate API call if client is not authenticated, but authenticates after an interactive popup', function () {
						spyOn(MM.Extensions.Dropbox, 'popupLogin').andCallFake(function () {
							return jQuery.Deferred().resolve('credentials').promise();
						});
						testMethods.exec(true);
						expect(fakeDropboxApi.setCredentials).toHaveBeenCalledWith('credentials');
						expect(fakeDropboxApi[testMethods.api]).toHaveBeenCalled();
						expect(fail).not.toHaveBeenCalled();
						expect(success).not.toHaveBeenCalled();
					});
				});
			});
		});
		describe('authenticated operations', function () {
			beforeEach(function () {
				fakeDropboxApi.isAuthenticated.andReturn(true);
			});
			describe('loadMap', function () {
				it('converts a map ID into a dropbox path by stripping d1 and urldecoding (to allow for spaces and slashes)', function () {
					underTest.loadMap('d1folder%2Ffile%20name.txt', false);
					expect(fakeDropboxApi.readFile).toHaveBeenCalled();
					expect(fakeDropboxApi.readFile.calls[0].args[0]).toBe('folder/file name.txt');
				});
				it('propagates API errors', function () {
					fakeDropboxApi.readFile.andCallFake(function (path, options, callback) {
						callback('error');
					});
					underTest.loadMap('d1folder%2Ffile%20name.txt', false).then(success, fail, notify);
					expect(fail).toHaveBeenCalledWith('');
				});
				it('resolves using content and file name from the API callback if no error - leaves mimetype undefined because dropbox does not guess right', function () {
					var mapId = 'd1folder%2Ffile%20name.txt',
						contents = 'file contents',
						name = 'file name';
					fakeDropboxApi.readFile.andCallFake(function (path, options, callback) {
						callback(undefined, contents, {name: name});
					});
					underTest.loadMap(mapId, false).then(success, fail, notify);
					expect(success).toHaveBeenCalledWith(contents, mapId, undefined, {}, name);
				});
			});
		});
	});
});
