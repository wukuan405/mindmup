/* global jasmine, beforeEach, it, describe, expect, jQuery, spyOn, sinon, MM*/
describe('LayoutExport', function () {
	'use strict';
	describe('LayoutExportController', function () {
		var fileSystem, mapModel, currentLayout, underTest, requestId, resultPoller;
		beforeEach(function () {
			fileSystem = {};
			mapModel = {};
			currentLayout = { 'a': 'b' };
			requestId = 'AIUHDKUHGDKHUD';
			fileSystem.saveMap = jasmine.createSpy('saveMap');
			fileSystem.saveMap.andReturn(jQuery.Deferred().resolve(requestId).promise());
			mapModel.getCurrentLayout = jasmine.createSpy('getCurrentLayout');
			mapModel.getCurrentLayout.andReturn(currentLayout);
			resultPoller = {
				deferred: jQuery.Deferred(),
				poll: function () {
					return resultPoller.deferred.promise();
				}
			};
			underTest = new MM.LayoutExportController(mapModel, fileSystem, resultPoller);

		});
		it('pulls out current map model layout, and publishes JSON version of that to an fileSystem', function () {
			underTest.startExport();
			expect(fileSystem.saveMap).toHaveBeenCalledWith(JSON.stringify(currentLayout));
		});
		it('polls for result when the request is started', function () {
			spyOn(resultPoller, 'poll').andCallThrough();
			underTest.startExport();
			expect(resultPoller.poll).toHaveBeenCalledWith(requestId);
		});

		it('resolves promise when the poller resolves', function () {
			var resolved = jasmine.createSpy('resolved'),
				url = 'http://www.google.com';

			underTest.startExport().then(resolved);

			resultPoller.deferred.resolve(url);
			expect(resolved).toHaveBeenCalledWith(url);
		});
		it('rejects promise if the poller rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';

			underTest.startExport().fail(fail);

			resultPoller.deferred.reject(reason);
			expect(fail).toHaveBeenCalledWith(reason);
		});
		it('rejects promise if the file system rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';
			fileSystem.saveMap.andReturn(jQuery.Deferred().reject(reason).promise());
			spyOn(resultPoller, 'poll').andCallThrough();

			underTest.startExport().fail(fail);

			expect(fail).toHaveBeenCalledWith(reason);
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
