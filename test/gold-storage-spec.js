/* global MM, describe, it, beforeEach, expect, jQuery, jasmine, _, spyOn*/
describe('MM.GoldStorage', function () {
	'use strict';
	var underTest, goldApi, s3Api, fileList, goldApiListDeferred, goldSaveConfigDeferred, s3SaveDeferred, options, modalConfirmation, showModalToConfirmDeferred, goldExistsDeferred, goldFileUrlDeferred, s3LoadUrlDeferred;
	beforeEach(function () {
		options = {'p': {isPrivate: true}, 'b': {isPrivate: false}, listPrefix: 'b'};
		goldApiListDeferred = jQuery.Deferred();
		goldSaveConfigDeferred = jQuery.Deferred();
		goldExistsDeferred = jQuery.Deferred();
		goldFileUrlDeferred = jQuery.Deferred();
		goldApi  = {
			exists: jasmine.createSpy('exists').and.returnValue(goldExistsDeferred.promise()),
			listFiles: jasmine.createSpy('listFiles').and.returnValue(goldApiListDeferred.promise()),
			generateSaveConfig: jasmine.createSpy('generateSaveConfig').and.returnValue(goldSaveConfigDeferred.promise()),
			fileUrl: jasmine.createSpy('fileUrl').and.returnValue(goldFileUrlDeferred.promise()),
			deleteFile: jasmine.createSpy('deleteFile')
		};
		s3SaveDeferred = jQuery.Deferred();
		s3LoadUrlDeferred = jQuery.Deferred();
		s3Api = {
			save: jasmine.createSpy('save').and.returnValue(s3SaveDeferred.promise()),
			loadUrl: jasmine.createSpy('loadUrl').and.returnValue(s3LoadUrlDeferred.promise())
		};
		showModalToConfirmDeferred = jQuery.Deferred();
		modalConfirmation = {
			showModalToConfirm: jasmine.createSpy('showModalToConfirm').and.returnValue(showModalToConfirmDeferred.promise())
		};
		fileList = [
			{title: 'map1.mup', modifiedDate: '2014-01-07T12:13:41.000Z'},
			{title: 'a map / with \'funny\' chars?.mup', modifiedDate: '2014-01-10T12:13:41.000Z'}
		];

		underTest = new MM.GoldStorage(goldApi, s3Api, modalConfirmation, options);

	});
	describe('list', function () {
		describe('should resolve with a list of files', function () {
			it('provided by the gold api, converting file names into mapids', function () {
				var resolvedSpy = jasmine.createSpy('resolved'),
					expectedList = [
						{id: 'b/jimbo/map1.mup', title: 'map1.mup', modifiedDate: '2014-01-07T12:13:41.000Z'},
						{id: 'b/jimbo/a%20map%20%2F%20with%20\'funny\'%20chars%3F.mup', title: 'a map / with \'funny\' chars?.mup', modifiedDate: '2014-01-10T12:13:41.000Z'}
					];
				underTest.list().then(resolvedSpy);
				goldApiListDeferred.resolve(fileList, 'jimbo');
				expect(resolvedSpy).toHaveBeenCalledWith(expectedList);

			});
		});
		it('it should reject when the gold api rejects, preserving the rejection reason', function () {
			var listSpy = jasmine.createSpy('listrejected');
			underTest.list().fail(listSpy);
			goldApiListDeferred.reject('more-wrong');
			expect(listSpy).toHaveBeenCalledWith('more-wrong');
		});
	});
	describe('saveMap', function () {
		var contentToSave, mapId, filename;
		beforeEach(function () {
			contentToSave = '{}';
			mapId = 'b/jimbo/foo.mup';
			filename = 'map with a space.mup';
		});
		describe('configuration', function () {
			describe('retrieves it from the gold api', function () {
				_.each([true, false], function (arg) {
					it('and passes showAuthDialogs=' + arg + ' to the api', function () {
						underTest.saveMap('b', contentToSave, mapId, filename, arg);
						expect(goldApi.generateSaveConfig).toHaveBeenCalledWith(arg);
					});
				});
			});
			describe('rejection', function () {
				var rejectSpy;
				beforeEach(function () {
					rejectSpy = jasmine.createSpy('rejected');
					underTest.saveMap('b', contentToSave, mapId, filename).fail(rejectSpy);
					goldSaveConfigDeferred.reject('whatever');
				});
				it('rejects when gold api rejects, preserving the error reason', function () {
					expect(rejectSpy).toHaveBeenCalledWith('whatever');
				});
				it('does not attempt to save the file when the gold api rejects', function () {
					expect(s3Api.save).not.toHaveBeenCalled();
				});
			});
		});
		describe('saves the file', function () {
			var saveConfig, s3SaveConfig;
			beforeEach(function () {
				saveConfig = {foo: 'a'};
				s3SaveConfig = {key: 'jimbo/foo.mup', foo: 'a'};
				goldSaveConfigDeferred.resolve(saveConfig, 'jimbo');
				goldExistsDeferred.resolve(false);
			});
			it('passes additional save configuration to the s3 api', function () {
				underTest.saveMap('b', contentToSave, mapId, filename);
				expect(s3Api.save).toHaveBeenCalledWith(contentToSave, s3SaveConfig, {isPrivate: false});
			});
			it('resolves with map ID and adapter properties when save resolves', function () {
				var resolveSpy = jasmine.createSpy('resolved');
				s3SaveDeferred.resolve();
				underTest.saveMap('b', contentToSave, mapId, filename).then(resolveSpy);
				expect(resolveSpy).toHaveBeenCalledWith(mapId, {editable: true});
			});
			it('rejects and preserves the error reason when save rejects', function () {
				var rejectSpy = jasmine.createSpy('rejected');
				underTest.saveMap('b', contentToSave, mapId, filename).fail(rejectSpy);
				s3SaveDeferred.reject('whatever');
				expect(rejectSpy).toHaveBeenCalledWith('whatever');
			});

			describe('url encoded mapid is generated when', function () {
				_.each([
					['map id is not set', 'b'],
					// ['map id does not match this provider', 'p/jimbo/foo.mup'],
					['mapid is for another user', 'b/jonny/foo.mup'],
					['map is not in the provider format', 'a1jhkdshkfdshfkdsfhfd'],
					['map id is undefined (imported maps)', undefined]
				], function (args) {
					it(args[0], function () {
						var resolveSpy = jasmine.createSpy('resolved');
						underTest.saveMap('b', contentToSave, args[1], filename).then(resolveSpy);
						s3SaveDeferred.resolve();
						expect(s3Api.save).toHaveBeenCalledWith(contentToSave, {key: 'jimbo/map with a space.mup', foo: 'a'}, {isPrivate: false});
						expect(resolveSpy).toHaveBeenCalledWith('b/jimbo/map%20with%20a%20space.mup', {editable: true});
					});
				});
			});
		});
		describe('does not prevent overwriting the file intentionally', function () {
			beforeEach(function () {
				goldSaveConfigDeferred.resolve({}, 'jimbo');
			});
			it('saves without confirmation when changing the current file', function () {
				underTest.saveMap('b', contentToSave, mapId, filename);
				expect(modalConfirmation.showModalToConfirm).not.toHaveBeenCalled();
				expect(s3Api.save).toHaveBeenCalled();
			});
			it('saves without confirmation when moving the same map from public to private', function () {
				underTest.saveMap('b', contentToSave, 'p/jimbo/foo.mup', filename);
				expect(modalConfirmation.showModalToConfirm).not.toHaveBeenCalled();
				expect(s3Api.save).toHaveBeenCalledWith(contentToSave, {key: 'jimbo/foo.mup'}, {isPrivate: false});
			});
			it('checks for duplicate file when saving from an unrecognised prefix', function () {
				underTest.saveMap('b', contentToSave, 'd/jimbo/foo.mup', 'map file name .mup');
				expect(goldApi.exists).toHaveBeenCalledWith('map file name .mup');
			});
		});
		describe('prevents unintentional over-writes', function () {
			var resolveSpy, rejectSpy;
			beforeEach(function () {
				resolveSpy = jasmine.createSpy('resolved');
				rejectSpy = jasmine.createSpy('rejected');
				goldSaveConfigDeferred.resolve({}, 'jimbo');
				underTest.saveMap('b', contentToSave, 'b', filename).then(resolveSpy, rejectSpy);
			});
			it('uses the goldApi to check if the map exists when mapid has changed', function () {
				expect(goldApi.exists).toHaveBeenCalledWith('map with a space.mup');
			});
			it('does not ask for confirmation if the file does not exist already', function () {
				goldExistsDeferred.resolve(false);
				expect(modalConfirmation.showModalToConfirm).not.toHaveBeenCalled();
				expect(s3Api.save).toHaveBeenCalled();
			});
			describe('when a duplicate file exists', function () {
				beforeEach(function () {
					goldExistsDeferred.resolve(true);
				});
				it('asks for confirmation before overwriting duplicate file names', function () {
					expect(modalConfirmation.showModalToConfirm).toHaveBeenCalled();
					expect(s3Api.save).not.toHaveBeenCalled();
				});
				it('rejects with user-cancel if the confirmation rejects, without saving the file', function () {
					showModalToConfirmDeferred.reject();
					expect(rejectSpy).toHaveBeenCalledWith('user-cancel');
				});
				it('saves the file if the confirmation resolves', function () {
					showModalToConfirmDeferred.resolve();
					expect(s3Api.save).toHaveBeenCalled();
				});
			});
		});
	});
	describe('loadMap', function () {
		var rejectSpy;
		beforeEach(function () {
			rejectSpy = jasmine.createSpy('reject');
		});
		it('rejects with invalid-args if prefix not recognised', function () {
			underTest.loadMap('x/jimbo/foo.mup').fail(rejectSpy);
			expect(rejectSpy).toHaveBeenCalledWith('invalid-args');
		});
		describe('uses goldApi to get the URL', function () {
			describe('passing the file key and the options related to the prefix when ',
				{
					'public with dialog': ['b', true, false],
					'public without dialog': ['b', false, false],
					'private with dialog': ['p', true,  true],
					'private without dialog': ['p', false, true]
				},
				function (prefix, showDialogs,  isPrivate) {
					underTest.loadMap(prefix + '/jimbo/foo%20bar.mup', showDialogs);
					expect(goldApi.fileUrl).toHaveBeenCalledWith(showDialogs, 'jimbo', 'foo bar.mup', isPrivate);
				});
			it('rejects when the goldApi rejects, preserving the error reason', function () {
				underTest.loadMap('b/jimbo/foo.mup').fail(rejectSpy);
				goldFileUrlDeferred.reject('reason');
				expect(rejectSpy).toHaveBeenCalledWith('reason');
				expect(s3Api.loadUrl).not.toHaveBeenCalled();
			});
		});

		describe('uses s3Api to load a map', function () {
			var resolveSpy,
				content = '{}';
			beforeEach(function () {
				resolveSpy = jasmine.createSpy('resolve');
				goldFileUrlDeferred.resolve('https://.../jimbo/foo.mup');
				underTest.loadMap('b/jimbo/foo.mup').then(resolveSpy, rejectSpy);
			});
			it('waits for goldAPI to resolve, then passes the URL on to S3 API to load the file', function () {
				expect(s3Api.loadUrl).toHaveBeenCalledWith('https://.../jimbo/foo.mup');
			});
			it('resolves when S3 api resolves, with content, mapId, application/json and file system properties', function () {
				s3LoadUrlDeferred.resolve(content);
				expect(resolveSpy).toHaveBeenCalledWith(content, 'b/jimbo/foo.mup', 'application/json', {editable: true});
			});
			it('rejects when S3 api rejects, preserving the error reason', function () {
				s3LoadUrlDeferred.reject('a-reason');
				expect(rejectSpy).toHaveBeenCalledWith('a-reason');
				expect(s3Api.loadUrl.calls.count()).toBe(1);
			});
		});
		describe('when attempting to load a private map from a public url', function () {

			it('falls back to the private map url if the public one fails with reason map-not-found', function () {
				var resolveSpy,
					content = '{}',
					publicUrl = 'http://..../freddy/foo.mup',
					privateUrl = 'http://..../freddy/foo.mup?sign=signature';

				resolveSpy = jasmine.createSpy('resolve');
				s3Api.loadUrl.and.callFake(function (url) {
					if (url === publicUrl) {
						return jQuery.Deferred().reject('map-not-found').promise();
					} else {
						return jQuery.Deferred().resolve(content).promise();
					}
				});
				goldApi.fileUrl.and.callFake(function (showDialogs, account, fileKey, isPrivate) {
					return jQuery.Deferred().resolve(isPrivate ? privateUrl : publicUrl).promise();
				});
				underTest.loadMap('b/freddy/foo.mup').then(resolveSpy);

				expect(s3Api.loadUrl).toHaveBeenCalledWith(privateUrl);
				expect(resolveSpy).toHaveBeenCalledWith(content, 'p/freddy/foo.mup', 'application/json', {editable: true});
			});
		});
	});
	describe('deleteMap', function () {
		it('passes map name to delete to gold api', function () {
			underTest.deleteMap('hello');
			expect(goldApi.deleteFile).toHaveBeenCalledWith('hello');
		});
		it('returns the promise passed from the gold api', function () {
			var deferred = jQuery.Deferred(),
				promise = deferred.promise(),
				result;
			goldApi.deleteFile.and.returnValue(promise);
			result = underTest.deleteMap('hello');
			expect(result).toBe(promise);
		});
	});
	describe('fileSystemFor', function () {
		describe('creates an object with a filesystem api based on the prefix', {
				'private': ['p', 'MindMup Gold Private', 'p/a/b', 'b/a/b'],
				'public': ['b', 'MindMup Gold Public', 'b/a/b', 'p/a/b']
			}, function (prefix, expectedDescription, recognisedMap, unrecognisedMap) {
				var fileSystem = underTest.fileSystemFor(prefix, expectedDescription);
				expect(fileSystem.recognises(prefix)).toBeTruthy();
				expect(fileSystem.recognises(recognisedMap)).toBeTruthy();
				expect(fileSystem.recognises(unrecognisedMap)).toBeFalsy();
				expect(fileSystem.description).toEqual(expectedDescription);
			});
		it('proxies saveMap method by adding a prefix', function () {
			var retVal = 'expected';
			spyOn(underTest, 'saveMap').and.returnValue(retVal);
			expect(underTest.fileSystemFor('b', 'test filesystem').saveMap('content', 'b/jimmy/foo.mup', 'a new map', true)).toEqual(retVal);
			expect(underTest.saveMap).toHaveBeenCalledWith('b', 'content', 'b/jimmy/foo.mup', 'a new map', true);
		});
		it('proxies load method', function () {
			var retVal = 'expected';
			spyOn(underTest, 'loadMap').and.returnValue(retVal);
			expect(underTest.fileSystemFor('b', 'test filesystem').loadMap('b/jimmy/foo.mup', true)).toEqual(retVal);
			expect(underTest.loadMap).toHaveBeenCalledWith('b/jimmy/foo.mup', true);
		});
	});

});

