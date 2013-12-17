/* global jasmine, beforeEach, it, describe, expect, jQuery, spyOn, sinon, MM*/
describe('LayoutExport', function () {
	'use strict';
	describe('LayoutExportController', function () {
		var fileSystem, mapModel, currentLayout, underTest, requestId, resultPoller, errorPoller, activityLog;

		beforeEach(function () {
			var buildPoller = function () {
				var poller = {
					deferred: jQuery.Deferred(),
					poll: function () {
						return poller.deferred.promise();
					}
				};
				return poller;
			};
			fileSystem = {};
			mapModel = {};
			activityLog = {};
			currentLayout = { 'a': 'b' };
			requestId = 'AIUHDKUHGDKHUD';
			fileSystem.saveMap = jasmine.createSpy('saveMap');
			activityLog.log = jasmine.createSpy('log');
			fileSystem.saveMap.andReturn(jQuery.Deferred().resolve(requestId).promise());
			mapModel.getCurrentLayout = jasmine.createSpy('getCurrentLayout');
			mapModel.getCurrentLayout.andReturn(currentLayout);
			resultPoller = buildPoller();
			errorPoller = buildPoller();
			underTest = new MM.LayoutExportController(mapModel, fileSystem, resultPoller, errorPoller, activityLog);

		});
		it('pulls out current map model layout, and publishes JSON version of that to an fileSystem', function () {
			underTest.startExport();
			expect(fileSystem.saveMap).toHaveBeenCalledWith(JSON.stringify(currentLayout));
		});
		it('merges any object passed with the current map model layout, and publishes JSON version of that to an fileSystem, leaving current layout unchanged', function () {
			underTest.startExport({'foo': 'bar'});
			expect(fileSystem.saveMap).toHaveBeenCalledWith(JSON.stringify({'a': 'b', 'foo': 'bar'}));
			expect(currentLayout).toEqual({'a': 'b'});
		});
		it('polls for result when the request is started', function () {
			spyOn(resultPoller, 'poll').andCallThrough();
			underTest.startExport();
			expect(resultPoller.poll).toHaveBeenCalledWith(requestId, jasmine.any(Function));
		});
		it('polls for error when the request is started', function () {
			spyOn(errorPoller, 'poll').andCallThrough();
			underTest.startExport();
			expect(errorPoller.poll).toHaveBeenCalledWith(requestId, jasmine.any(Function));
		});
		it('export is marked as not stopped until deferred object is resolved', function () {
			spyOn(errorPoller, 'poll').andCallThrough();
			underTest.startExport();
			var stopFunc = errorPoller.poll.mostRecentCall.args[1];
			expect(stopFunc()).toBeFalsy();
		});
		it('export is marked as stopped after promise is resolved', function () {
			spyOn(errorPoller, 'poll').andCallThrough();
			underTest.startExport();
			resultPoller.deferred.resolve('foo');
			var stopFunc = errorPoller.poll.mostRecentCall.args[1];
			expect(stopFunc()).toBeTruthy();
		});
		it('resolves promise when the poller resolves', function () {
			var resolved = jasmine.createSpy('resolved'),
				url = 'http://www.google.com';

			underTest.startExport().then(resolved);

			resultPoller.deferred.resolve(url);
			expect(resolved).toHaveBeenCalledWith(url);
		});
		it('rejects if the error poller resolves before the result poller', function () {
			var resolved = jasmine.createSpy('resolved'),
				url = 'http://www.google.com',
				fail = jasmine.createSpy('fail');

			underTest.startExport().then(resolved, fail);

			errorPoller.deferred.resolve('www.fail.com');
			resultPoller.deferred.resolve(url);

			expect(resolved).not.toHaveBeenCalled();
			expect(fail).toHaveBeenCalledWith('generation-error', requestId);
		});
		it('rejects promise if the poller rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';

			underTest.startExport().fail(fail);

			resultPoller.deferred.reject(reason);
			expect(fail).toHaveBeenCalledWith(reason, requestId);
		});
		it('rejects promise if the file system rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';
			fileSystem.saveMap.andReturn(jQuery.Deferred().reject(reason).promise());
			spyOn(resultPoller, 'poll').andCallThrough();

			underTest.startExport().fail(fail);

			expect(fail).toHaveBeenCalledWith(reason, undefined);
			expect(resultPoller.poll).not.toHaveBeenCalled();
		});
	});
	describe('S3FilePoller', function () {
		var ajaxDeferred, underTest, sleepPeriod, clock, withFile, withoutFile, timeoutPeriod;
		beforeEach(function () {
			timeoutPeriod = 10000;
			ajaxDeferred = jQuery.Deferred();
			sleepPeriod = 1000;
			spyOn(jQuery, 'ajax').andReturn(ajaxDeferred.promise());
			clock = sinon.useFakeTimers();
			underTest = new MM.S3FilePoller('test-bucket', 'out/', '.pdf', sleepPeriod, timeoutPeriod);
			withFile = '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>mindmup-pdf</Name><Prefix>out/hello.pdf</Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>out/hello.pdf</Key><LastModified>2013-12-04T15:02:11.000Z</LastModified><ETag>&quot;047d0c7c9663813b053ae18957420632&quot;</ETag><Size>24504</Size><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>';
			withoutFile = '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>mindmup-pdf</Name><Prefix>out/x.pdf</Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>';
		});
		it('polls using ajax bucket listing for a given prefix and postfix', function () {
			underTest.poll('REQUEST');
			expect(jQuery.ajax).toHaveBeenCalledWith({
				url: 'http://test-bucket.s3.amazonaws.com/?prefix=out%2FREQUEST.pdf&max-keys=1',
				method: 'GET'
			});
		});
		it('keeps polling if response is empty', function () {
			underTest.poll('REQUEST');
			jQuery.ajax.reset();
			ajaxDeferred.resolve(withoutFile);
			clock.tick(sleepPeriod + 1);
			expect(jQuery.ajax).toHaveBeenCalledWith({
				url: 'http://test-bucket.s3.amazonaws.com/?prefix=out%2FREQUEST.pdf&max-keys=1',
				method: 'GET'
			});
		});
		it('stops polling after resolved', function () {
			underTest.poll('REQUEST');
			jQuery.ajax.reset();
			ajaxDeferred.resolve(withFile);
			clock.tick(sleepPeriod + 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('should not make initial call when semaphore function shows stopped', function () {
			underTest.poll('REQUEST', function () {return true; });
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('stops polling when semaphore function shows stopped', function () {
			var stopped = false;
			underTest.poll('REQUEST', function () {return stopped; });
			jQuery.ajax.reset();
			ajaxDeferred.resolve(withoutFile);
			stopped = true;
			clock.tick(sleepPeriod + 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('polls only after sleep period', function () {
			underTest.poll('REQUEST');
			jQuery.ajax.reset();
			ajaxDeferred.resolve(withoutFile);
			clock.tick(sleepPeriod - 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
		it('resolves if the ajax response contains at least one file, using the first response key', function () {
			var resolved = jasmine.createSpy();
			underTest.poll('REQUEST').then(resolved);
			ajaxDeferred.resolve(withFile);
			expect(resolved).toHaveBeenCalledWith('http://test-bucket.s3.amazonaws.com/out/hello.pdf');
		});
		it('retries if network request fails', function () {
			underTest.poll('REQUEST');
			jQuery.ajax.reset();
			ajaxDeferred.reject();
			clock.tick(sleepPeriod + 1);
			expect(jQuery.ajax).toHaveBeenCalledWith({
				url: 'http://test-bucket.s3.amazonaws.com/?prefix=out%2FREQUEST.pdf&max-keys=1',
				method: 'GET'
			});
		});
		it('rejects if it times out', function () {
			var rejected = jasmine.createSpy('rejected');
			underTest.poll('REQUEST').fail(rejected);
			clock.tick(timeoutPeriod + 1);
			expect(rejected).toHaveBeenCalledWith('polling-timeout');
		});
		it('should not time out if stopped after the initial request', function () {
			var rejected = jasmine.createSpy('rejected'),
				stopped = false;
			underTest.poll('REQUEST', function () {return stopped; }).fail(rejected);
			stopped = true;
			clock.tick(timeoutPeriod + 1);
			expect(rejected).not.toHaveBeenCalled();
		});

		it('stops polling after it times out', function () {
			underTest.poll('REQUEST');
			clock.tick(timeoutPeriod + 1);
			ajaxDeferred.resolve(withoutFile);
			jQuery.ajax.reset();
			clock.tick(sleepPeriod + 1);
			expect(jQuery.ajax).not.toHaveBeenCalled();
		});
	});
});
