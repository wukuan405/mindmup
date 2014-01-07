/* global jasmine, beforeEach, it, describe, expect, jQuery, spyOn,  MM, _*/
describe('LayoutExport', function () {
	'use strict';
	describe('LayoutExportController', function () {
		var fileSystem, mapModel, currentLayout, underTest, requestId, poller, activityLog,
			lastPollerCallFor = function (url) {
				return _.find(poller.poll.calls, function (call) {
					return call.args[0] === url;
				});
			};

		beforeEach(function () {
			var buildPoller = function () {
				var poller = {
					deferred: {}, //jQuery.Deferred(),
					poll: function (url) {
						var deferred = jQuery.Deferred();
						poller.deferred[url] = deferred;
						return deferred.promise();
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
			fileSystem.saveMap.andReturn(
				jQuery.Deferred().resolve(
					requestId,
					{'signedErrorListUrl': 'errorlisturl', 'signedOutputListUrl': 'outputlisturl', 'signedOutputUrl': 'outputurl'}
				).promise());

			mapModel.getCurrentLayout = jasmine.createSpy('getCurrentLayout');
			mapModel.getCurrentLayout.andReturn(currentLayout);
			poller = buildPoller();
			underTest = new MM.LayoutExportController(mapModel, fileSystem, poller, activityLog);

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
		it('polls for result and error when the request is started', function () {
			spyOn(poller, 'poll').andCallThrough();
			underTest.startExport();
			expect(poller.poll).toHaveBeenCalledWith('outputlisturl', jasmine.any(Object));
			expect(poller.poll).toHaveBeenCalledWith('errorlisturl', jasmine.any(Object));
		});

		it('export is marked as not stopped until deferred object is resolved', function () {
			spyOn(poller, 'poll').andCallThrough();
			underTest.startExport();
			expect(lastPollerCallFor('outputlisturl').args[1].stoppedSemaphore()).toBeFalsy();
		});
		it('export is marked as stopped after promise is resolved', function () {
			spyOn(poller, 'poll').andCallThrough();
			underTest.startExport();
			poller.deferred.outputlisturl.resolve('foo');
			expect(lastPollerCallFor('errorlisturl').args[1].stoppedSemaphore()).toBeTruthy();
		});
		it('resolves promise with signed output url when the poller resolves', function () {
			var resolved = jasmine.createSpy('resolved');

			underTest.startExport().then(resolved);

			poller.deferred.outputlisturl.resolve();
			expect(resolved).toHaveBeenCalledWith('outputurl');
		});
		it('rejects if the error poller resolves before the result poller', function () {
			var resolved = jasmine.createSpy('resolved'),
				url = 'http://www.google.com',
				fail = jasmine.createSpy('fail');

			underTest.startExport().then(resolved, fail);

			poller.deferred.errorlisturl.resolve('www.fail.com');
			poller.deferred.outputlisturl.resolve(url);

			expect(resolved).not.toHaveBeenCalled();
			expect(fail).toHaveBeenCalledWith('generation-error', requestId);
		});
		it('rejects promise if the poller rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';

			underTest.startExport().fail(fail);

			poller.deferred.outputlisturl.reject(reason);
			expect(fail).toHaveBeenCalledWith(reason, requestId);
		});
		it('rejects promise if the file system rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';
			fileSystem.saveMap.andReturn(jQuery.Deferred().reject(reason).promise());
			spyOn(poller, 'poll').andCallThrough();

			underTest.startExport().fail(fail);

			expect(fail).toHaveBeenCalledWith(reason, undefined);
			expect(poller.poll).not.toHaveBeenCalled();
		});
	});
});
