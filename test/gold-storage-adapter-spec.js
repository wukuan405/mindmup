/* global MM, describe, it, beforeEach, spyOn, expect, jQuery, jasmine*/
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

	});
	describe('loadMap', function () {

	});
	describe('recognises ', function () {

	});


});