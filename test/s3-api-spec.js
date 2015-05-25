/*global beforeEach, afterEach, describe, expect, it, MM, spyOn, jQuery, window, jasmine, sinon, document*/
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
		spyOn(jQuery, 'ajax').and.returnValue(ajaxDeferred.promise());
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
				var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
				expect(ajaxPost.url).toEqual('https://bucket-name.s3.amazonaws.com/');
				expect(ajaxPost.type).toEqual('POST');
			});
			it('posts the content and contenttype', function () {
				underTest.save('to save', saveConfiguration);
				var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
				expect(ajaxPost.data.params).toEqual(jasmine.objectContaining({'file' : 'to save', 'Content-Type': 'text/plain'}));
			});
			it('posts identification signature and policy', function () {
				underTest.save('to save', saveConfiguration);
				var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
				expect(ajaxPost.data.params).toEqual(jasmine.objectContaining({
					key: 'file key',
					AWSAccessKeyId: 'aws access key',
					policy: 'save policy',
					signature: 'policy signature'
				}));
			});
			it('posts the acl as public-read is there are no options supplied', function () {
				underTest.save('to save', saveConfiguration);
				var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
				expect(ajaxPost.data.params.acl).toEqual('public-read');
			});
			it('posts the acl as bucket-owner-read is there private option is true', function () {
				underTest.save('to save', saveConfiguration, {isPrivate: true});
				var ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
				expect(ajaxPost.data.params.acl).toEqual('bucket-owner-read');
			});
			it('configures the XMLHttpRequest so send upload notifications', function () {
				var spy = jasmine.createSpy('progressSpy'), ajaxPost, evt = document.createEvent('Event');
				evt.initEvent('progress', true, true);
				evt.lengthComputable = true;
				evt.total = 400;
				evt.loaded = 200;
				underTest.save('to save', saveConfiguration, {isPrivate: true}).progress(spy);

				ajaxPost = jQuery.ajax.calls.mostRecent().args[0];
				ajaxPost.xhr().upload.dispatchEvent(evt);
				expect(spy).toHaveBeenCalledWith('50%');
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
				var fileTooLargeResponse = '<Error><Code>EntityTooLarge</Code><Message>Your proposed upload exceeds the maximum allowed size</Message><ProposedSize>5245254</ProposedSize><RequestId>645D7BA0DCC454D9</RequestId><HostId>9ZX65MGwKi/hpe05eJuNp6mPgsRPZk54bplqX93ImjlLzojSesXCGRCZRjrkUDK8</HostId><MaxSizeAllowed>5242880</MaxSizeAllowed></Error>',
					noErrorCodeResponse = '<Error><Message>Your proposed upload exceeds the maximum allowed size</Message><ProposedSize>5245254</ProposedSize><RequestId>645D7BA0DCC454D9</RequestId><HostId>9ZX65MGwKi/hpe05eJuNp6mPgsRPZk54bplqX93ImjlLzojSesXCGRCZRjrkUDK8</HostId><MaxSizeAllowed>5242880</MaxSizeAllowed></Error>';

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
	describe('poll', function () {
		var clock, withFile, withoutFile;
		beforeEach(function () {
			underTest.pollerDefaults.timeoutPeriod = 10000;
			underTest.pollerDefaults.sleepPeriod = 1000;
			clock = sinon.useFakeTimers();
			withFile = '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>mindmup-pdf</Name><Prefix>out/hello.pdf</Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>out/hello.pdf</Key><LastModified>2013-12-04T15:02:11.000Z</LastModified><ETag>&quot;047d0c7c9663813b053ae18957420632&quot;</ETag><Size>24504</Size><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>';
			withoutFile = '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>mindmup-pdf</Name><Prefix>out/x.pdf</Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>';
		});
		afterEach(function () {
			clock.restore();
		});
		it('uses ajax for a given URL', function () {
			underTest.poll('REQUEST');
			expect(jQuery.ajax).toHaveBeenCalledWith({
				url: 'REQUEST',
				method: 'GET',
				timeout: underTest.pollerDefaults.sleepPeriod
			});
		});
		it('keeps polling if response is empty', function () {
			underTest.poll('REQUEST');
			jQuery.ajax.calls.reset();
			ajaxDeferred.resolve(withoutFile);
			clock.tick(underTest.pollerDefaults.sleepPeriod + 1);
			expect(jQuery.ajax).toHaveBeenCalledWith({
				url: 'REQUEST',
				method: 'GET',
				timeout: underTest.pollerDefaults.sleepPeriod
			});
		});
		it('stops polling after resolved', function () {
			underTest.poll('REQUEST');
			jQuery.ajax.calls.reset();
			ajaxDeferred.resolve(withFile);
			clock.tick(underTest.pollerDefaults.sleepPeriod + 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('should not make initial call when semaphore function shows stopped', function () {
			underTest.poll('REQUEST', {stoppedSemaphore: function () {
				return true;
			}});
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('stops polling when semaphore function shows stopped', function () {
			var stopped = false;
			underTest.poll('REQUEST', {stoppedSemaphore: function () {
				return stopped;
			}});
			jQuery.ajax.calls.reset();
			ajaxDeferred.resolve(withoutFile);
			stopped = true;
			clock.tick(underTest.pollerDefaults.sleepPeriod + 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('polls only after sleep period for default', function () {
			underTest.poll('REQUEST');
			jQuery.ajax.calls.reset();
			ajaxDeferred.resolve(withoutFile);
			clock.tick(underTest.pollerDefaults.sleepPeriod - 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('polls only after sleep period for supplied sleepPeriod', function () {
			var sleep = underTest.pollerDefaults.sleepPeriod + 1000;
			underTest.poll('REQUEST', {sleepPeriod: sleep});
			jQuery.ajax.calls.reset();
			ajaxDeferred.resolve(withoutFile);
			clock.tick(sleep - 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('should not mutate the default options', function () {
			var before = underTest.pollerDefaults.sleepPeriod;
			underTest.poll('REQUEST', {sleepPeriod: before + 1000});
			expect(underTest.pollerDefaults.sleepPeriod).toEqual(before);
		});
		it('resolves if the ajax response contains at least one file, using the first response key', function () {
			var resolved = jasmine.createSpy();
			underTest.poll('REQUEST').then(resolved);
			ajaxDeferred.resolve(withFile);
			expect(resolved).toHaveBeenCalledWith('out/hello.pdf');
		});
		it('retries if network request fails', function () {
			underTest.poll('REQUEST');
			jQuery.ajax.calls.reset();
			ajaxDeferred.reject();
			clock.tick(underTest.pollerDefaults.sleepPeriod + 1);
			expect(jQuery.ajax).toHaveBeenCalledWith({
				url: 'REQUEST',
				timeout: underTest.pollerDefaults.sleepPeriod,
				method: 'GET'
			});
		});
		it('rejects if it times out', function () {
			var rejected = jasmine.createSpy('rejected');
			underTest.poll('REQUEST').fail(rejected);
			clock.tick(underTest.pollerDefaults.timeoutPeriod + 1);
			expect(rejected).toHaveBeenCalledWith('polling-timeout');
		});
		it('should not time out if stopped after the initial request', function () {
			var rejected = jasmine.createSpy('rejected'),
				stopped = false;
			underTest.poll('REQUEST', {stoppedSemaphore: function () {
				return stopped;
			}}).fail(rejected);
			stopped = true;
			clock.tick(underTest.pollerDefaults.timeoutPeriod + 1);
			expect(rejected).not.toHaveBeenCalled();
		});

		it('stops polling after it times out', function () {
			underTest.poll('REQUEST');
			clock.tick(underTest.pollerDefaults.timeoutPeriod + 1);
			ajaxDeferred.resolve(withoutFile);
			jQuery.ajax.calls.reset();
			clock.tick(underTest.pollerDefaults.sleepPeriod + 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
	});
	describe('loadUrl', function () {
		it('makes an ajax request using the url with cache set to false', function () {
			underTest.loadUrl('https://foo.com');
			expect(jQuery.ajax).toHaveBeenCalledWith('https://foo.com', {cache: false});
		});
		it('resolves with the result of the ajax call', function () {
			var resolveSpy = jasmine.createSpy('resolve');
			ajaxDeferred.resolve('response text');
			underTest.loadUrl('https://foo.com').then(resolveSpy);
			expect(resolveSpy).toHaveBeenCalledWith('response text');
		});
		describe('rejects with according to error status is ', {
			'map-not-found when 404': [404, 'map-not-found'],
			'map-not-found when 403': [403, 'map-not-found'],
			'network-error when 500': [500, 'network-error']
		}, function (errorCode, expectedReason) {
			var rejectSpy = jasmine.createSpy('reject');
			ajaxDeferred.reject({status: errorCode});
			underTest.loadUrl('https://foo.com').fail(rejectSpy);
			expect(rejectSpy).toHaveBeenCalledWith(expectedReason);
		});
	});

});
