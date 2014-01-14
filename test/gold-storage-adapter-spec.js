/* global MM, describe, it, beforeEach, expect, jQuery, jasmine, _*/
describe('MM.GoldStorageAdapter', function () {
	'use strict';
	var underTest, goldApi, s3Api, fileList, goldApiListDeferred, goldSaveConfigDeferred, s3SaveDeferred, saveOptions, modalConfirmation, showModalToConfirmDeferred, goldExistsDeferred;
	beforeEach(function () {
		saveOptions = {isPrivate: true};
		goldApiListDeferred = jQuery.Deferred();
		goldSaveConfigDeferred = jQuery.Deferred();
		goldExistsDeferred = jQuery.Deferred();
		goldApi  = {
			exists: jasmine.createSpy('exists').andReturn(goldExistsDeferred.promise()),
			listFiles: jasmine.createSpy('listFiles').andReturn(goldApiListDeferred.promise()),
			generateSaveConfig: jasmine.createSpy('generateSaveConfig').andReturn(goldSaveConfigDeferred.promise())
		};
		s3SaveDeferred = jQuery.Deferred();
		s3Api = {
			save: jasmine.createSpy('save').andReturn(s3SaveDeferred.promise())
		};
		showModalToConfirmDeferred = jQuery.Deferred();
		modalConfirmation = {
			showModalToConfirm: jasmine.createSpy('showModalToConfirm').andReturn(showModalToConfirmDeferred.promise())
		};
		fileList = [
			{title: 'map1.mup', modifiedDate: '2014-01-07T12:13:41.000Z'},
			{title: 'a map / with \'funny\' chars?.mup', modifiedDate: '2014-01-10T12:13:41.000Z'}
		];
		underTest = new MM.GoldStorageAdapter('b', goldApi, s3Api, modalConfirmation, saveOptions);
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
						underTest.saveMap(contentToSave, mapId, filename, arg);
						expect(goldApi.generateSaveConfig).toHaveBeenCalledWith(arg);
					});
				});
			});
			describe('rejection', function () {
				var rejectSpy;
				beforeEach(function () {
					rejectSpy = jasmine.createSpy('rejected');
					underTest.saveMap(contentToSave, mapId, filename).fail(rejectSpy);
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
				underTest.saveMap(contentToSave, mapId, filename);
				expect(s3Api.save).toHaveBeenCalledWith(contentToSave, s3SaveConfig, saveOptions);
			});
			it('resolves with map ID and adapter properties when save resolves', function () {
				var resolveSpy = jasmine.createSpy('resolved');
				s3SaveDeferred.resolve();
				underTest.saveMap(contentToSave, mapId, filename).then(resolveSpy);
				expect(resolveSpy).toHaveBeenCalledWith(mapId, {editable: true});
			});
			it('rejects and preserves the error reason when save rejects', function () {
				var rejectSpy = jasmine.createSpy('rejected');
				underTest.saveMap(contentToSave, mapId, filename).fail(rejectSpy);
				s3SaveDeferred.reject('whatever');
				expect(rejectSpy).toHaveBeenCalledWith('whatever');
			});

			describe('url encoded mapid is generated when', function () {
				_.each([
					['map id is not set', 'b'],
					// ['map id does not match this provider', 'p/jimbo/foo.mup'],
					['mapid is for another user', 'b/jonny/foo.mup'],
					['map is not in the provider format', 'a1jhkdshkfdshfkdsfhfd']
				], function (args) {
					it(args[0], function () {
						var resolveSpy = jasmine.createSpy('resolved');
						underTest.saveMap(contentToSave, args[1], filename).then(resolveSpy);
						s3SaveDeferred.resolve();
						expect(s3Api.save).toHaveBeenCalledWith(contentToSave, {key: 'jimbo/map with a space.mup', foo: 'a'}, saveOptions);
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
				underTest.saveMap(contentToSave, mapId, filename);
				expect(modalConfirmation.showModalToConfirm).not.toHaveBeenCalled();
				expect(s3Api.save).toHaveBeenCalled();
			});
			it('saves without confirmation when moving the same map from public to private', function () {
				underTest.saveMap(contentToSave, 'p/jimbo/foo.mup', filename);
				expect(modalConfirmation.showModalToConfirm).not.toHaveBeenCalled();
				expect(s3Api.save).toHaveBeenCalled();
			});

		});
		describe('prevents unintentional over-writes', function () {
			var resolveSpy, rejectSpy;
			beforeEach(function () {
				resolveSpy = jasmine.createSpy('resolved');
				rejectSpy = jasmine.createSpy('rejected');
				underTest.saveMap(contentToSave, 'b', filename).then(resolveSpy, rejectSpy);
				goldSaveConfigDeferred.resolve({}, 'jimbo');
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

	});
	describe('recognises', function () {

	});
	describe('description', function () {

	});

});
