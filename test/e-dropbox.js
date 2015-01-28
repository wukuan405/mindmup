/*global jasmine, describe, it, beforeEach, MM, expect, window, _, spyOn, jQuery */
describe('Dropbox integration', function () {
	'use strict';
	describe('DropboxFileSystem', function () {
		var underTest,
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
					exec: function (interactive) {
						underTest.loadMap('mapId', interactive).then(success, fail, notify);
					},
					api: 'readFile'
				},
				saveMap: {
					exec: function (interactive) {
						underTest.saveMap('', 'mapId', '', interactive).then(success, fail, notify);
					},
					api: 'writeFile'
				},
				listFiles: {
					exec: function (interactive) {
						underTest.listFiles(interactive, '').then(success, fail, notify);
					},
					api: 'readdir'
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
						expect(fakeDropboxApi.authenticate.calls.count()).toBe(1);
						expect(fakeDropboxApi.authenticate.calls.first().args[0]).toEqual({interactive: false});
						expect(success).not.toHaveBeenCalled();
						expect(fail).not.toHaveBeenCalled();
					});
					it('rejects with not-authenticated if not interactive and immediate auth fails', function () {
						fakeDropboxApi.authenticate.and.callFake(function (interactive, callback) {
							callback('dropbox error');
						});
						testMethods.exec();
						expect(fail).toHaveBeenCalledWith('not-authenticated');
					});
					it('rejects with not-authenticated if not interactive and immediate auth completes without the client being authenticated', function () {
						fakeDropboxApi.authenticate.and.callFake(function (interactive, callback) {
							callback();
						});
						testMethods.exec();
						expect(fail).toHaveBeenCalledWith('not-authenticated');
					});
					it('launches the popup login if interactive and not authenticated, propagating failures', function () {
						spyOn(MM.Extensions.Dropbox, 'popupLogin').and.callFake(function () {
							return jQuery.Deferred().reject('user-cancel').promise();
						});
						testMethods.exec(true);
						expect(MM.Extensions.Dropbox.popupLogin).toHaveBeenCalled();
						expect(fail).toHaveBeenCalledWith('user-cancel');
					});
					it('propagates to the appropriate API call if client exists and is authenticated', function () {
						fakeDropboxApi.isAuthenticated.and.returnValue(true);
						testMethods.exec();
						expect(fail).not.toHaveBeenCalled();
						expect(success).not.toHaveBeenCalled();
						expect(fakeDropboxApi[testMethods.api]).toHaveBeenCalled();
					});
					it('propagates to the appropriate API call if client exists and is not authenticated, but authenticates immediately if non interactive', function () {
						fakeDropboxApi.authenticate.and.callFake(function (interactive, callback) {
							fakeDropboxApi.isAuthenticated.calls.reset();
							fakeDropboxApi.isAuthenticated.and.returnValue(true);
							callback();
						});
						testMethods.exec();
						expect(fail).not.toHaveBeenCalled();
						expect(success).not.toHaveBeenCalled();
						expect(fakeDropboxApi[testMethods.api]).toHaveBeenCalled();
					});
					it('propagates to the appropriate API call if client is not authenticated, but authenticates after an interactive popup', function () {
						spyOn(MM.Extensions.Dropbox, 'popupLogin').and.callFake(function () {
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
				fakeDropboxApi.isAuthenticated.and.returnValue(true);
			});
			describe('loadMap', function () {
				it('converts a map ID into a dropbox path by stripping d1 and urldecoding (to allow for spaces and slashes)', function () {
					underTest.loadMap('d1folder%2Ffile%20name.txt', false);
					expect(fakeDropboxApi.readFile).toHaveBeenCalled();
					expect(fakeDropboxApi.readFile.calls.first().args[0]).toBe('folder/file name.txt');
				});
				describe('API errors', [
					['401 is not authenticated', 401, 'not-authenticated'],
					['403 is not authenticated', 403, 'not-authenticated'],
					['404 is not found', 404, 'not-found'],
					['429 is network error', 409, 'network-error'],
					['507 is quota error', 507, 'file-too-large'],
					['5xx, apart from 507 is network error', 503, 'network-error'],
					['undefined code is a network error', false, 'network-error']
				], function (dropboxCode, mindmupReason) {
					fakeDropboxApi.readFile.and.callFake(function (path, options, callback) {
						callback({status: dropboxCode});
					});
					underTest.loadMap('d1folder%2Ffile%20name.txt', false).then(success, fail, notify);
					expect(fail).toHaveBeenCalledWith(mindmupReason);
				});
				it('propagates error label if supplied', function () {
					fakeDropboxApi.readFile.and.callFake(function (path, options, callback) {
						callback({status: 404, response: {error: 'File not found'}});
					});
					underTest.loadMap('d1folder%2Ffile%20name.txt', false).then(success, fail, notify);
					expect(fail).toHaveBeenCalledWith('not-found', 'File not found');
				});
				it('resolves using content and file name from the API callback if no error - leaves mimetype undefined because dropbox does not guess right', function () {
					var mapId = 'd1folder%2Ffile%20name.txt',
						contents = 'file contents',
						name = 'file name';
					fakeDropboxApi.readFile.and.callFake(function (path, options, callback) {
						callback(undefined, contents, {name: name});
					});
					underTest.loadMap(mapId, false).then(success, fail, notify);
					expect(success).toHaveBeenCalledWith(contents, mapId, undefined, {}, name);
				});
				it('rejects with network error when response is invalid', function () {
					var mapId = 'd1folder%2Ffile%20name.txt',
						contents = 'file contents';
					fakeDropboxApi.readFile.and.callFake(function (path, options, callback) {
						callback(undefined, contents, {});
					});
					underTest.loadMap(mapId, false).then(success, fail, notify);
					expect(success).not.toHaveBeenCalled();
				});
			});
			describe('saveMap', function () {
				var contents = 'contents',
					fileName = 'file name.txt';
				it('creates a new file from the file name if mapId is not defined', function () {
					underTest.saveMap(contents, undefined, fileName, false);
					expect(fakeDropboxApi.writeFile).toHaveBeenCalled();
					expect(fakeDropboxApi.writeFile.calls.first().args[0]).toBe('file name.txt');
				});
				it('creates a new file from the file name if mapId is not recognised by the dropbox api', function () {
					underTest.saveMap(contents, 'a1kuahsfuhsd', fileName, false);
					expect(fakeDropboxApi.writeFile).toHaveBeenCalled();
					expect(fakeDropboxApi.writeFile.calls.first().args[0]).toBe('file name.txt');
				});
				it('creates a new file from the file name if mapId is incomplete (new-d scenario)', function () {
					underTest.saveMap(contents, 'd', fileName, false);
					expect(fakeDropboxApi.writeFile).toHaveBeenCalled();
					expect(fakeDropboxApi.writeFile.calls.first().args[0]).toBe('file name.txt');
				});
				it('saves the file under the path urldecoded from the given mapId (without starting d1) if it is recognised by the dropbox api, regardless of the file name', function () {
					underTest.saveMap(contents, 'd1folder%2Fnewfile.mup', fileName, false);
					expect(fakeDropboxApi.writeFile).toHaveBeenCalled();
					expect(fakeDropboxApi.writeFile.calls.first().args[0]).toBe('folder/newfile.mup');
				});
				it('propagates API errors', function () {
					fakeDropboxApi.writeFile.and.callFake(function (path, content, options, callback) {
						callback('error');
					});
					underTest.saveMap(contents, 'd1folder%2Fnewfile.mup', fileName, false).then(success, fail);
					expect(fail).toHaveBeenCalled();
				});
				it('resolves using the generated file path, regardless of the original map id', function () {
					fakeDropboxApi.writeFile.and.callFake(function (path, content, options, callback) {
						callback(undefined, {path: '/abc/def ghi.jkl', 'is_dir': false});
					});
					underTest.saveMap(contents, 'd1folder%2Fnewfile.mup', fileName, false).then(success, fail);
					expect(success).toHaveBeenCalledWith('d1%2Fabc%2Fdef%20ghi.jkl', {});
				});
				it('resolves even if the response comes as a string', function () {
					fakeDropboxApi.writeFile.and.callFake(function (path, content, options, callback) {
						callback(undefined, '{"path": "/abc/def ghi.jkl", "is_dir": false}');
					});
					underTest.saveMap(contents, 'd1folder%2Fnewfile.mup', fileName, false).then(success, fail);
					expect(success).toHaveBeenCalledWith('d1%2Fabc%2Fdef%20ghi.jkl', {});
				});
				it('rejects with a network error when response is invalid', function () {
					fakeDropboxApi.writeFile.and.callFake(function (path, content, options, callback) {
						callback(undefined, {path: '', 'is_dir': false});
					});
					underTest.saveMap(contents, 'd1folder%2Fnewfile.mup', fileName, false).then(success, fail);
					expect(fail).toHaveBeenCalledWith('network-error');
					expect(success).not.toHaveBeenCalled();
				});
			});
			describe('listFiles', function () {
				it('sends the path to the api readdir method', function () {
					underTest.listFiles(false, '/some/path');
					expect(fakeDropboxApi.readdir).toHaveBeenCalled();
					expect(fakeDropboxApi.readdir.calls.first().args[0]).toBe('/some/path');
				});
				it('propagates back API errors', function () {
					fakeDropboxApi.readdir.and.callFake(function (path, options, callback) {
						callback('api-error');
					});
					underTest.listFiles(false, '/some/path').then(success, fail, notify);
					expect(fail).toHaveBeenCalled();
				});
				it('rejects invalid responses as network errors', function () {
					fakeDropboxApi.readdir.and.callFake(function (path, options, callback) {
						callback();
					});
					underTest.listFiles(false, '/some/path').then(success, fail, notify);
					expect(fail).toHaveBeenCalledWith('network-error');
				});
				it('resolves with folder contents, adding mapId for files (not for dirs) and keeping modifiedAt, name and path', function () {
					fakeDropboxApi.readdir.and.callFake(function (path, options, callback) {
						callback(undefined, '', '', [{modifiedAt: 1, name: '2', path: '3', 'is_dir': true},
                            {modifiedAt: 2, name: '4', path: '/5/6', 'is_dir': false}]);
					});
					underTest.listFiles(false, '/some/path').then(success, fail, notify);
					expect(success).toHaveBeenCalledWith([{modifiedAt: 1, name: '2', path: '3', mapId: false}, {modifiedAt: 2, name: '4', path: '/5/6', mapId: 'd1%2F5%2F6'}]);
				});
			});
		});
	});
});
