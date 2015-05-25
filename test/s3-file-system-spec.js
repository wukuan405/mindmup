/*global beforeEach, afterEach, describe, expect, it, MM, jQuery, jasmine, spyOn, _*/
describe('MM.S3FileSystem', function () {
	'use strict';
	var configGenerator, underTest, s3Api, s3ApiFunc, mapContent, mapId, fileName,
		resolveSpy, rejectSpy, publishingConfig;

	beforeEach(function () {
		mapContent = '{}';
		mapId = 'atestmap';
		publishingConfig = {mapId: 'anewmapname'};
		resolveSpy = jasmine.createSpy('resolved');
		rejectSpy = jasmine.createSpy('rejected');
		s3ApiFunc = MM.S3Api;
		s3Api = {
			loadUrlDeferred: jQuery.Deferred(),
			saveDeferred: jQuery.Deferred()
		};
		s3Api.loadUrl  = jasmine.createSpy('loadUrl').and.returnValue(s3Api.loadUrlDeferred.promise());
		s3Api.save = jasmine.createSpy('save').and.returnValue(s3Api.saveDeferred.promise());

		MM.S3Api = jasmine.createSpy('s3Api)').and.returnValue(s3Api);

		configGenerator  = {
			generateDeferred: jQuery.Deferred(),
			buildMapUrlDeferred: jQuery.Deferred()
		};
		configGenerator.generate = jasmine.createSpy('generate').and.returnValue(configGenerator.generateDeferred.promise());
		configGenerator.buildMapUrl = jasmine.createSpy('buildMapUrl').and.returnValue(configGenerator.buildMapUrlDeferred.promise());

		underTest = new MM.S3FileSystem(configGenerator, 'a', 'S3-file-system');
	});
	afterEach(function () {
		MM.S3Api = s3ApiFunc;
	});
	describe('loadMap', function () {
		describe('uses configGenerator to build map url', function () {
			describe('passes mapId and showAuthenticationDialog', function () {
				_.each([true, false], function (arg) {
					it('when showAuthentication is ' + arg, function () {
						underTest.loadMap(mapId, arg);
						expect(configGenerator.buildMapUrl).toHaveBeenCalledWith(mapId, 'a', arg);
					});
				});
			});
			describe('uses promise returned by config generator', function () {
				beforeEach(function () {
					underTest.loadMap(mapId).then(resolveSpy, rejectSpy);
				});
				it('rejects when config generator rejects, preserving the reason and not calling s3Api', function () {
					configGenerator.buildMapUrlDeferred.reject('no-can-do');
					expect(rejectSpy).toHaveBeenCalledWith('no-can-do');
					expect(s3Api.loadUrl).not.toHaveBeenCalled();
				});
				it('passes mapUrl returned by configGenerator to s3Api when it resolves', function () {
					configGenerator.buildMapUrlDeferred.resolve('http://foo.com/atestmap');
					expect(s3Api.loadUrl).toHaveBeenCalledWith('http://foo.com/atestmap');
				});
			});
		});
		describe('uses s3Api to load the map content', function () {
			beforeEach(function () {
				configGenerator.buildMapUrlDeferred.resolve('http://foo.com/atestmap');
				underTest.loadMap(mapId).then(resolveSpy, rejectSpy);
			});
			it('rejects when s3Api.loadUrl rejects, preserving the reason', function () {
				s3Api.loadUrlDeferred.reject('uh-oh');
				expect(rejectSpy).toHaveBeenCalledWith('uh-oh');
			});
			it('resolves with content loded by s3APi, mapId, mime type and map properties', function () {
				s3Api.loadUrlDeferred.resolve(mapContent);
				expect(resolveSpy).toHaveBeenCalledWith(mapContent, mapId, 'application/json', {editable: true});
			});
		});
	});
	describe('saveMap', function () {
		describe('uses configGenerator to generate publishing config', function () {
			describe('passes, mapId, filename, prefix and showAuthenticationDialog to configGenerator', function () {
				_.each([true, false], function (arg) {
					it('when showAuthentication is ' + arg, function () {
						underTest.saveMap(mapContent, mapId, fileName, arg);
						expect(configGenerator.generate).toHaveBeenCalledWith(mapId, fileName, 'a', arg);
					});
				});
			});
			describe('uses the promise returned by the configGenerator', function () {
				beforeEach(function () {
					underTest.saveMap(mapContent, mapId, fileName).then(resolveSpy, rejectSpy);
				});
				it('rejects when configGenerator rejects, preserving the reason and not calling the s3Api', function () {
					configGenerator.generateDeferred.reject('whyiorta');
					expect(rejectSpy).toHaveBeenCalledWith('whyiorta');
					expect(s3Api.save).not.toHaveBeenCalled();
				});
				it('passes the publishing configuration to s3Api.save with the content and file properties', function () {
					configGenerator.generateDeferred.resolve(publishingConfig);
					expect(s3Api.save).toHaveBeenCalledWith(mapContent, publishingConfig, {'isPrivate': false});
				});
			});
			describe('uses s3Api to save the map content', function () {
				beforeEach(function () {
					underTest.saveMap(mapContent, mapId, fileName).then(resolveSpy, rejectSpy);
					configGenerator.generateDeferred.resolve(publishingConfig);
				});
				it('rejects when the s3Api rejects, preserving the reason', function () {
					s3Api.saveDeferred.reject('noreason');
					expect(rejectSpy).toHaveBeenCalledWith('noreason');
				});
				it('resolves with the new map id and merged properties when s3Api resolves', function () {
					s3Api.saveDeferred.resolve();
					expect(resolveSpy).toHaveBeenCalledWith(publishingConfig.mapId, {mapId: publishingConfig.mapId, editable: true});
				});
			});
		});
	});
	describe('destroyLastSave', function () {
		beforeEach(function () {
			underTest.saveMap(mapContent, mapId, fileName);
			configGenerator.generateDeferred.resolve(publishingConfig);
			s3Api.save.calls.reset();
			underTest.destroyLastSave().then(resolveSpy, rejectSpy);
		});
		it('saves over the last saved configuration', function () {
			expect(s3Api.save).toHaveBeenCalledWith(jasmine.any(String), publishingConfig, {'isPrivate': false});
		});
		it('resolves when s3api save resolves', function () {
			s3Api.saveDeferred.resolve();
			expect(resolveSpy).toHaveBeenCalled();
		});
		it('rejects when s3api save rejects', function () {
			s3Api.saveDeferred.reject('noreason');
			expect(rejectSpy).toHaveBeenCalledWith('noreason');
		});
	});
});
describe('MM.S3ConfigGenerator', function () {
	'use strict';
	var s3Url, publishingConfigUrl, underTest, ajaxDeferred, folder, resolveSpy, rejectSpy;
	beforeEach(function () {
		resolveSpy = jasmine.createSpy('resolved');
		rejectSpy = jasmine.createSpy('rejected');

		ajaxDeferred = jQuery.Deferred();
		spyOn(jQuery, 'ajax').and.returnValue(ajaxDeferred.promise());
		s3Url = 'S3_URL/';
		publishingConfigUrl = '/publishingConfig';
		folder = 'mapshere/';
		underTest = new MM.S3ConfigGenerator(s3Url, publishingConfigUrl, folder);
	});
	it('buildMapUrl returns mapid prefixed by configured s3Url and folder, postfixed by .json', function () {
		underTest.buildMapUrl('amapname').then(resolveSpy);
		expect(resolveSpy).toHaveBeenCalledWith('S3_URL/mapshere/amapname.json');
	});
	describe('generate', function () {
		beforeEach(function () {
			underTest.generate().then(resolveSpy, rejectSpy);
		});
		it('rejects with network-error and any reason passed from ajax when when ajax rejects', function () {
			underTest.generate().fail(rejectSpy);
			ajaxDeferred.reject('somereason');
			expect(rejectSpy).toHaveBeenCalledWith('network-error', 'somereason');
		});
		it('posts an AJAX request to the API url', function () {
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
			expect(ajaxPost.url).toEqual('/publishingConfig');
			expect(ajaxPost.type).toEqual('POST');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.processData).toBeFalsy();
			expect(ajaxPost.contentType).toBeFalsy();
		});
		it('resolves with configuration returned by ajax call, merged with s3Url and with mapid set to the value of s3UploadIdentifier', function () {
			ajaxDeferred.resolve({s3UploadIdentifier: 'anewmapname'});
			expect(resolveSpy).toHaveBeenCalledWith({
				mapId: 'anewmapname',
				s3Url: 'S3_URL/',
				s3UploadIdentifier: 'anewmapname'
			});
		});
	});
});
