/* global MM, describe, it, beforeEach, spyOn, expect, jQuery, jasmine, _*/
describe('MM.GoldStorageAdapter', function () {
	'use strict';
	var underTest, goldApi, fileList, goldApiListDeferred;
	beforeEach(function () {
		goldApiListDeferred = jQuery.Deferred();
		goldApi  = {listFiles: function () { return  goldApiListDeferred.promise(); }};
		fileList = [
			{title: 'map1.mup', modifiedDate: '2014-01-07T12:13:41.000Z'},
			{title: 'a map / with \'funny\' chars?.mup', modifiedDate: '2014-01-10T12:13:41.000Z'}
		];
		underTest = new MM.GoldStorageAdapter('b', goldApi);
	});
	describe('list', function () {
		describe('should resolve with a list of files', function () {
			beforeEach(function () {
				spyOn(goldApi, 'listFiles').andReturn(goldApiListDeferred.resolve(fileList, 'jimbo').promise());
			});
			it('provided by the gold api, converting file names into mapids', function () {
				var resolvedSpy = jasmine.createSpy('resolved'),
					expectedList = [
						{id: 'b/jimbo/map1.mup', title: 'map1.mup', modifiedDate: '2014-01-07T12:13:41.000Z'},
						{id: 'b/jimbo/a%20map%20%2F%20with%20\'funny\'%20chars%3F.mup', title: 'a map / with \'funny\' chars?.mup', modifiedDate: '2014-01-10T12:13:41.000Z'}
					];
				underTest.list().then(resolvedSpy);
				expect(resolvedSpy).toHaveBeenCalledWith(expectedList);

			});
		});
		it('it should reject when the gold api rejects, preserving the rejection reason', function () {
			var listSpy = jasmine.createSpy('listrejected');
			spyOn(goldApi, 'listFiles').andReturn(goldApiListDeferred.reject('more-wrong').promise());
			underTest.list().fail(listSpy);
			expect(listSpy).toHaveBeenCalledWith('more-wrong');
		});
	});
	describe('saveMap', function () {
		describe('configuration', function () {
			it('retrieves it from the gold api', function () {
				
			});
			_.each([true, false], function (arg) {
				it('passes showAuthDialogs=' + arg + ' to the api', function () {

				});
			});
			it('rejects when gold api rejects, preserving the error reason', function () {
			
			});
		});
		describe('saves the file', function () {
			it('passes the content and save configuration to the s3 api', function () {});

			it('saves public maps when adapter is public', function () {
			
			});
			it('saves private maps when adapter is private', function () {
			
			});
			it('resolves with map ID and adapter properties when save resolves', function () {

			});
			it('rejects and preserves the error reason when save rejects', function () {

			});
		});
		describe('prevents unintentional over-writes', function () {
			it('asks for confirmation before overwriting duplicate file names', function () {

			});
			it('does not ask for confirmation if the file does not exist already', function () {
			});
			it('saves without confirmation when changing the current file', function () {

			});
			it('saves without confirmation when moving the same map from public to private', function () {

			});
			it('saves without confirmation when moving the same map from private to public', function () {

			});
			it('rejects with user-cancel if the confirmation rejects, without saving the file', function () {

			});
			it('saves the file if the confirmation resolves', function () {

			});
			it('uses mapid as key if saving an existing file', function () {
			
			});
			it('uses file name as key if creating a new file', function () {

			});
			it('uses file name as key if moving from a different storage provider', function () {

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
