/* global describe, it, expect, MM, beforeEach, jasmine, jQuery, spyOn, window, afterEach */
describe('MM.GoldApi', function () {
	'use strict';
	var goldLicenseManager, underTest, activityLog, oldFormData, ajaxDeferred, license, endSpy, goldLicenseManagerDeferred;
	beforeEach(function () {
		ajaxDeferred = jQuery.Deferred();
		spyOn(jQuery, 'ajax').andReturn(ajaxDeferred.promise());

		goldLicenseManagerDeferred = jQuery.Deferred();
		goldLicenseManager = {getLicense: function () {}, retrieveLicense: function () {return goldLicenseManagerDeferred.promise(); }};
		license = {version: '2', accountType: 'mindmup-gold', account: 'test', signature: 'validsignature'};
		spyOn(goldLicenseManager, 'getLicense').andReturn(license);

		activityLog = { log: jasmine.createSpy(), timer: jasmine.createSpy()};
		endSpy = jasmine.createSpy();

		activityLog.timer.andReturn({end: endSpy});
		underTest = new MM.GoldApi(goldLicenseManager, 'API_URL', activityLog);
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
			var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
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
	describe('getExpiry', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.getExpiry();
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
			expect(ajaxPost.url).toEqual('API_URL/license/expiry');
			expect(ajaxPost.dataType).toBeUndefined();
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license)});
		});
	});
	describe('register', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.register('test_name', 'test_email');
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
			expect(ajaxPost.url).toEqual('API_URL/license/register');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.data.params).toEqual({'to_email' : 'test_email', 'account_name' : 'test_name'});
		});
	});
	describe('generateExportConfiguration', function () {
		it('posts an AJAX request to the API url', function () {
			underTest.generateExportConfiguration('pdf');
			expect(jQuery.ajax).toHaveBeenCalled();
			var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
			expect(ajaxPost.url).toEqual('API_URL/file/export_config');
			expect(ajaxPost.dataType).toEqual('json');
			expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license), 'format': 'pdf'});
		});
	});
	describe('list', function () {
		describe('posts an AJAX request to the API url using license provided by license manager, specifying if a license dialog should be shown if user interaction is required', function () {
			beforeEach(function () {
				spyOn(goldLicenseManager, 'retrieveLicense').andReturn(goldLicenseManagerDeferred.resolve(license).promise());
			});
			jQuery([true, false]).each(function (arg) {
				it('when showLicenseDialog is ' + arg, function () {
					underTest.listFiles(arg);
					expect(goldLicenseManager.retrieveLicense).toHaveBeenCalledWith(arg);
				});
			});
			it('uses the license returned when it posts an AJAX request to the API url', function () {
				underTest.listFiles();
				expect(jQuery.ajax).toHaveBeenCalled();
				var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
				expect(ajaxPost.url).toEqual('API_URL/file/list');
				expect(ajaxPost.dataType).toBeUndefined();
				expect(ajaxPost.data.params).toEqual({'license' : JSON.stringify(license)});
			});
		});

		it('converts the response into a list of objects from xml', function () {
			var example = '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>mindmup-gold</Name><Prefix>dave/</Prefix><Marker></Marker><MaxKeys>100</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>jimbo/a map / with funny chars?.mup</Key><LastModified>2014-01-10T12:13:41.000Z</LastModified><ETag>&quot;62d3c2c0501f69bfe616b56936afb458&quot;</ETag><Size>79</Size><Owner><ID>b682c8bf07ef378a2566ba81eff11b58a1298ec117b94ec3a9cb591b67392584</ID><DisplayName>gojkoadzic</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents><Contents><Key>jimbo/foo.mup</Key><LastModified>2014-01-09T15:08:08.000Z</LastModified><ETag>&quot;b11d3862989dc5dda7c7f2ea692b6c17&quot;</ETag><Size>2018</Size><Owner><ID>b682c8bf07ef378a2566ba81eff11b58a1298ec117b94ec3a9cb591b67392584</ID><DisplayName>gojkoadzic</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>',
				resolveSpy = jasmine.createSpy('resolveSpy'),
				expected = [
					{title: 'a map / with funny chars?.mup', modifiedDate: '2014-01-10T12:13:41.000Z'},
					{title: 'foo.mup', modifiedDate: '2014-01-09T15:08:08.000Z'}
				];

			spyOn(goldLicenseManager, 'retrieveLicense').andReturn(goldLicenseManagerDeferred.resolve(license).promise());
			underTest.listFiles().then(resolveSpy);
			ajaxDeferred.resolve(example);

			expect(resolveSpy).toHaveBeenCalledWith(expected, license.account);
		});
	});
});
