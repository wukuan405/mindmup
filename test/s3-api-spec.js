/*global beforeEach, afterEach, describe, expect, it, MM, spyOn, jQuery, window, jasmine*/
describe('MM.S3Api', function () {
	'use strict';
	var underTest,
		ajaxDeferred,
		oldFormData,
		saveConfiguration;
	beforeEach(function () {
		saveConfiguration = {
			s3BucketName: 'bucket-name',
			key: 'file key',
			AWSAccessKeyId: 'aws access key',
			policy: 'save policy',
			signature: 'policy signature'
		};
		underTest = new MM.S3Api();
		ajaxDeferred = jQuery.Deferred();
		spyOn(jQuery, 'ajax').andReturn(ajaxDeferred.promise());
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
	describe('save', function () {
		describe('ajax posting', function () {
			it('posts an AJAX request to the API url defined by the configured bucket', function () {
				underTest.save('to save', saveConfiguration);
				expect(jQuery.ajax).toHaveBeenCalled();
				var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
				expect(ajaxPost.url).toEqual('https://bucket-name.s3.amazonaws.com/');
				expect(ajaxPost.type).toEqual('POST');
			});
			it('posts the content and contenttype', function () {
				underTest.save('to save', saveConfiguration);
				var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
				expect(ajaxPost.data.params).toPartiallyMatch({'file' : 'to save', 'Content-Type': 'text/plain'});
			});
			it('posts identification signature and policy', function () {
				underTest.save('to save', saveConfiguration);
				var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
				expect(ajaxPost.data.params).toPartiallyMatch({
					key: 'file key',
					AWSAccessKeyId: 'aws access key',
					policy: 'save policy',
					signature: 'policy signature'
				});
			});
			it('posts the acl as public-read is there are no options supplied', function () {
				underTest.save('to save', saveConfiguration);
				var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
				expect(ajaxPost.data.params.acl).toEqual('public-read');
			});
			it('posts the acl as bucket-owner-read is there private option is true', function () {
				underTest.save('to save', saveConfiguration, {isPrivate: true});
				var ajaxPost = jQuery.ajax.mostRecentCall.args[0];
				expect(ajaxPost.data.params.acl).toEqual('bucket-owner-read');
			});

		});
		describe('returned promise', function () {
			var resolved, rejected;
			beforeEach(function () {
				resolved = jasmine.createSpy('resolved');
				rejected = jasmine.createSpy('rejected');
				underTest.save('...', saveConfiguration).then(resolved, rejected);
			});
			it('should resolve when ajax resolves', function () {
				ajaxDeferred.resolve();
				expect(resolved).toHaveBeenCalled();
			});
			it('does not resolve until ajax resolves', function () {
				expect(resolved).not.toHaveBeenCalled();
			});
			describe('rejection', function () {
				var fileTooLargeResponse = '<Error><Code>EntityTooLarge</Code><Message>Your proposed upload exceeds the maximum allowed size</Message><ProposedSize>5245254</ProposedSize><RequestId>645D7BA0DCC454D9</RequestId><HostId>9ZX65MGwKi/hpe05eJuNp6mPgsRPZk54bplqX93ImjlLzojSesXCGRCZRjrkUDK8</HostId><MaxSizeAllowed>5242880</MaxSizeAllowed></Error>';
				var noErrorCodeResponse = '<Error><Message>Your proposed upload exceeds the maximum allowed size</Message><ProposedSize>5245254</ProposedSize><RequestId>645D7BA0DCC454D9</RequestId><HostId>9ZX65MGwKi/hpe05eJuNp6mPgsRPZk54bplqX93ImjlLzojSesXCGRCZRjrkUDK8</HostId><MaxSizeAllowed>5242880</MaxSizeAllowed></Error>';

				it('should fail with failed-authentication when response status is 403', function () {
					ajaxDeferred.reject({status: 403});
					expect(rejected).toHaveBeenCalledWith('failed-authentication');
				});
				describe('should fail with file-too-large if [Error Code] is EntityTooLarge, passing Error Message as additional rejection argument', function () {
					it('in the response text', function () {
						ajaxDeferred.reject({responseText: fileTooLargeResponse});
						expect(rejected).toHaveBeenCalledWith('file-too-large', 'Your proposed upload exceeds the maximum allowed size');
					});
					it('in the responseXML', function () {
						ajaxDeferred.reject({responseXML: jQuery.parseXML(fileTooLargeResponse)});
						expect(rejected).toHaveBeenCalledWith('file-too-large', 'Your proposed upload exceeds the maximum allowed size');
					});
				});
				describe('should fail with network-error', function () {
					describe('when the Error Code is not defined', function () {
						it('in the response text', function () {
							ajaxDeferred.reject({responseText: noErrorCodeResponse});
							expect(rejected).toHaveBeenCalledWith('network-error');
						});
						it('in the responseXML', function () {
							ajaxDeferred.reject({responseXML: jQuery.parseXML(noErrorCodeResponse)});
							expect(rejected).toHaveBeenCalledWith('network-error');
						});

					});
					it('when responseText is not valid xml', function () {
						ajaxDeferred.reject({responseText: 'sdakjlskadjlskajd'});
						expect(rejected).toHaveBeenCalledWith('network-error');
					});
				});
			});
		});

	});

});
