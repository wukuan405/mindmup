/* global describe, it, expect, MM, beforeEach, jasmine, jQuery, spyOn, window, afterEach, _ */
describe('MM.GoldApi', function () {
	'use strict';
	var goldLicenseManager, underTest, activityLog, oldFormData, ajaxDeferred, license, endSpy, goldLicenseManagerDeferred, resolveSpy, rejectSpy;
	beforeEach(function () {
		ajaxDeferred = jQuery.Deferred();
		spyOn(jQuery, 'ajax').and.returnValue(ajaxDeferred.promise());

		license = {version: '2', accountType: 'mindmup-gold', account: 'test', signature: 'validsignature'};
		goldLicenseManagerDeferred = jQuery.Deferred();
		goldLicenseManager = {
			getLicense: jasmine.createSpy('getLicense').and.returnValue(license),
			retrieveLicense: jasmine.createSpy('retrieveLicense').and.returnValue(goldLicenseManagerDeferred.promise())
		};

		activityLog = { log: jasmine.createSpy(), timer: jasmine.createSpy()};
		endSpy = jasmine.createSpy();

		activityLog.timer.and.returnValue({end: endSpy});
		underTest = new MM.GoldApi(goldLicenseManager, 'API_URL', activityLog, 'gold-bucket-name');
		resolveSpy = jasmine.createSpy('resolved');
		rejectSpy = jasmine.createSpy('reject');

		oldFormData = window.FormData;
		window.FormData = function () {
			this.params = {};
			this.append = function (key, value) {
				this.params[key] = value;
			};
		};
	});
	afterEach(function () {
		window.FormData = oldFormData;
	});
	describe('exec', function () {
		var execArgs, result, resolved, rejected;
		beforeEach(function () {
			resolved = jasmine.createSpy();
			rejected = jasmine.createSpy();
			execArgs = {'name': 'test_name'};
			result = underTest.exec('entity/action', execArgs).then(resolved, rejected);
		});
		it('posts an AJAX request to the API url', function () {
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
			expect(ajaxPost.url).toEqual('API_URL/entity/action');
			expect(ajaxPost.data.params).toEqual(execArgs);
			expect(ajaxPost.type).toEqual('POST');
		});

		it('returns a pending promise, waiting on ajax to resolve', function () {
			expect(result.state()).toBe('pending');
		});
		it('resolves with the parsed JSON when ajax resolves', function () {
			ajaxDeferred.resolve({'a': 'b'});
			expect(resolved).toHaveBeenCalledWith({'a': 'b'});
			expect(endSpy).toHaveBeenCalled();
		});
		it('rejects with the error reason if one of known errors', function () {
			ajaxDeferred.reject({responseText: 'invalid-args'});
			expect(rejected).toHaveBeenCalledWith('invalid-args');
			expect(endSpy).toHaveBeenCalled();
		});
		it('rejects with network-error if not a known error', function () {
			ajaxDeferred.reject({responseText: 'invalid-error'});
			expect(rejected).toHaveBeenCalledWith('network-error');
			expect(endSpy).toHaveBeenCalled();
		});
		it('starts the timer when request starts', function () {
			expect(activityLog.timer).toHaveBeenCalledWith('GoldApi', 'entity/action');
			expect(endSpy).not.toHaveBeenCalled();
		});
		it('logs actual failure', function () {
			ajaxDeferred.reject({responseText: 'invalid-error'});
			expect(activityLog.log).toHaveBeenCalledWith('GoldApi', 'error', 'entity/action:invalid-error');
			expect(endSpy).toHaveBeenCalled();
		});
	});
	describe('getSubscription', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.getSubscription();
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
			expect(ajaxPost.url).toEqual('API_URL/license/subscription');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license)});
		});
	});
	describe('cancelSubscription', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.cancelSubscription();
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
			expect(ajaxPost.url).toEqual('API_URL/license/cancel_subscription');
			expect(ajaxPost.dataType).toBeUndefined();
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license)});
		});
	});
	describe('register', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.register('test_name', 'test_email');
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
			expect(ajaxPost.url).toEqual('API_URL/license/register');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.data.params).toEqual({'to_email' : 'test_email', 'account_name' : 'test_name'});
		});
	});
	describe('generateExportConfiguration', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.generateExportConfiguration('pdf');
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
			expect(ajaxPost.url).toEqual('API_URL/file/export_config');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license), 'format': 'pdf'});
		});
	});
	describe('generateEchoConfiguration', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.generateEchoConfiguration('html', 'text/html');
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
			expect(ajaxPost.url).toEqual('API_URL/file/echo_config');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license), 'format': 'html', 'contenttype': 'text/html'});
		});
	});
	describe('listFiles', function () {
		it('converts the response into a list of objects from xml', function () {
			var example = '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>mindmup-gold</Name><Prefix>dave/</Prefix><Marker></Marker><MaxKeys>100</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>jimbo/a map / with funny chars?.mup</Key><LastModified>2014-01-10T12:13:41.000Z</LastModified><ETag>&quot;62d3c2c0501f69bfe616b56936afb458&quot;</ETag><Size>79</Size><Owner><ID>b682c8bf07ef378a2566ba81eff11b58a1298ec117b94ec3a9cb591b67392584</ID><DisplayName>gojkoadzic</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents><Contents><Key>jimbo/foo.mup</Key><LastModified>2014-01-09T15:08:08.000Z</LastModified><ETag>&quot;b11d3862989dc5dda7c7f2ea692b6c17&quot;</ETag><Size>2018</Size><Owner><ID>b682c8bf07ef378a2566ba81eff11b58a1298ec117b94ec3a9cb591b67392584</ID><DisplayName>gojkoadzic</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>',
				expected = [
					{title: 'a map / with funny chars?.mup', modifiedDate: '2014-01-10T12:13:41.000Z'},
					{title: 'foo.mup', modifiedDate: '2014-01-09T15:08:08.000Z'}
				];
			goldLicenseManagerDeferred.resolve(license);
			underTest.listFiles().then(resolveSpy);
			ajaxDeferred.resolve(example);

			expect(resolveSpy).toHaveBeenCalledWith(expected, license.account);
		});
	});
	describe('methods posting a license to the gold api ', function  () {
		_.each([
			['listFiles', 'API_URL/file/list', undefined],
			['generateSaveConfig', 'API_URL/file/upload_config', 'json'],
			['fileUrl', 'API_URL/file/url', undefined, function (showLicenseDialog) { return underTest.fileUrl(showLicenseDialog, 'test', 'filekey', true); }]
		], function (args) {
			var methodName = args[0],
				expectedUrl = args[1],
				dataType = args[2],
				call = args[3] || function (showLicenseDialog) { return underTest[methodName](showLicenseDialog); };
			describe(methodName, function () {
				_.each([true, false], function (arg) {
					it('when showLicenseDialog is ' + arg, function () {
						call(arg);
						expect(goldLicenseManager.retrieveLicense).toHaveBeenCalledWith(arg);
					});
				});
				it('rejects when the license manager rejects', function () {
					goldLicenseManagerDeferred.reject('urgh');
					call().fail(rejectSpy);
					expect(rejectSpy).toHaveBeenCalledWith('urgh');
				});
				it('uses the license returned when it posts an AJAX request to the API url', function () {
					call();
					goldLicenseManagerDeferred.resolve(license);
					expect(jQuery.ajax).toHaveBeenCalled();
					var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
					expect(ajaxPost.url).toEqual(expectedUrl);
					expect(ajaxPost.dataType).toBe(dataType);
					expect(ajaxPost.data.params.license).toEqual(JSON.stringify(license));
				});
			});
		});
	});
	describe('generateSaveConfig', function () {
		it('should resolve with the config returned by ajax and the account name', function () {
			goldLicenseManagerDeferred.resolve(license);
			ajaxDeferred.resolve({x: 'a'});
			underTest.generateSaveConfig(true).then(resolveSpy);
			expect(resolveSpy).toHaveBeenCalledWith({x: 'a'}, license.account);
		});
	});
	describe('fileUrl', function  () {
		it('should return unsigned url immediately', function () {
			underTest.fileUrl(true, 'jimmy', 'foo ? mup.mup', false).then(resolveSpy);
			expect(resolveSpy).toHaveBeenCalledWith('https://gold-bucket-name.s3.amazonaws.com/jimmy/foo%20%3F%20mup.mup');
		});
		describe('urls needing information about the license', function () {
			beforeEach(function () {
				goldLicenseManagerDeferred.resolve(license);
			});
			it('should reject requests to sign other peoples urls with not-authenticated', function () {
				underTest.fileUrl(true, 'jimmy', 'foo.mup', true).fail(rejectSpy);
				expect(jQuery.ajax).not.toHaveBeenCalled();
				expect(rejectSpy).toHaveBeenCalledWith('not-authenticated');
			});
			it('should pass the file key as a parameter to the server', function () {
				underTest.fileUrl(true, 'test', 'foo ? mup.mup', true);
				var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
				/*jshint camelcase:false*/
				expect(ajaxPost.data.params.file_key).toEqual('foo%20%3F%20mup.mup');
			});
			it('should return signed url from server ', function () {
				ajaxDeferred.resolve('https://gold-bucket-name.s3.amazonaws.com/test/foo.mup?sign=signature');
				underTest.fileUrl(true, 'test', 'foo.mup', true).then(resolveSpy);
				expect(resolveSpy).toHaveBeenCalledWith('https://gold-bucket-name.s3.amazonaws.com/test/foo.mup?sign=signature', 'test');
			});
		});
	});
	describe('exists', function  () {
		it('should reject as not-authenticated if the license is not set', function () {
			goldLicenseManager.getLicense.and.returnValue(false);
			underTest.exists('foo.mup').fail(rejectSpy);
			expect(rejectSpy).toHaveBeenCalledWith('not-authenticated');
		});
		it('should resolve as  true if the file exists', function () {
			ajaxDeferred.resolve('<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>mindmup-gold</Name><Prefix>test/foo.mup</Prefix><Marker></Marker><MaxKeys>1</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>jimbo/a map / with funny chars?.mup</Key><LastModified>2014-01-10T12:13:41.000Z</LastModified><ETag>&quot;62d3c2c0501f69bfe616b56936afb458&quot;</ETag><Size>79</Size><Owner><ID>b682c8bf07ef378a2566ba81eff11b58a1298ec117b94ec3a9cb591b67392584</ID><DisplayName>gojkoadzic</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>');
			underTest.exists('foo.mup').then(resolveSpy);
			expect(resolveSpy).toHaveBeenCalledWith(true);
		});
		it('should resolve as false if the file does not exist', function () {
			ajaxDeferred.resolve('<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>mindmup-gold</Name><Prefix>test/foo.mup</Prefix><Marker></Marker><MaxKeys>1</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>');
			underTest.exists('foo.mup').then(resolveSpy);
			expect(resolveSpy).toHaveBeenCalledWith(false);
		});
		it('posts an AJAX request to the API url', function () {
			underTest.exists('foo ? mup.mup');
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
			expect(ajaxPost.url).toEqual('API_URL/file/exists');
			expect(ajaxPost.dataType).toBeUndefined();
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license), 'file_key': 'foo%20%3F%20mup.mup'});
		});
	});

});
