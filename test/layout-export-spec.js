/* global jasmine, beforeEach, it, describe, expect, jQuery, spyOn,  MM, _*/
describe('LayoutExport', function () {
	'use strict';
	describe('LayoutExportController', function () {
		var configurationGenerator, mapModel, currentLayout, underTest, requestId, storageApi, activityLog, saveConfiguration, saveOptions,
			laststorageApiCallFor = function (url) {
				return _.find(storageApi.poll.calls.all(), function (call) {
					return call.args[0] === url;
				});
			};
		beforeEach(function () {
			var timer = jasmine.createSpyObj('timer', ['end']),
				buildStorageApi = function () {
				var storageApi = {
					deferred: {}, //jQuery.Deferred(),
					poll: function (url) {
						var deferred = jQuery.Deferred();
						storageApi.deferred[url] = deferred;
						return deferred.promise();
					}
				};

				storageApi.save = jasmine.createSpy('save');
				storageApi.save.and.returnValue(
					jQuery.Deferred().resolve().promise());
				return storageApi;
			};
			requestId = 'AIUHDKUHGDKHUD';
			saveConfiguration = {'signedErrorListUrl': 'errorlisturl', 'signedOutputListUrl': 'outputlisturl', 'signedOutputUrl': 'outputurl', 's3UploadIdentifier': requestId};
			saveOptions = {isPrivate: true};
			configurationGenerator = {};
			mapModel = {};
			activityLog = jasmine.createSpyObj('activityLog', ['log', 'timer']);
			activityLog.timer.and.returnValue(timer);
			currentLayout = { 'a': 'b' };
			configurationGenerator.generateExportConfiguration = jasmine.createSpy('saveMap');
			configurationGenerator.generateExportConfiguration.and.returnValue(
				jQuery.Deferred().resolve(saveConfiguration).promise()
			);

			mapModel.getCurrentLayout = jasmine.createSpy('getCurrentLayout');
			mapModel.getCurrentLayout.and.returnValue(currentLayout);
			storageApi = buildStorageApi();
			underTest = new MM.LayoutExportController(mapModel, configurationGenerator, storageApi, activityLog);

		});
		it('pulls out current map model layout, passes the format to the configuration generator, and publishes JSON version of that to the storageApi', function () {
			underTest.startExport('pdf');
			expect(configurationGenerator.generateExportConfiguration).toHaveBeenCalledWith('pdf');
			expect(storageApi.save).toHaveBeenCalledWith(JSON.stringify(currentLayout), saveConfiguration, saveOptions);
		});
		it('merges any object passed with the current map model layout, and publishes JSON version of that to an fileSystem, leaving current layout unchanged', function () {
			underTest.startExport('pdf', {'foo': 'bar'});
			expect(storageApi.save).toHaveBeenCalledWith(JSON.stringify({'a': 'b', 'foo': 'bar'}), saveConfiguration, saveOptions);
			expect(currentLayout).toEqual({'a': 'b'});
		});
		it('polls for result and error when the request is started', function () {
			spyOn(storageApi, 'poll').and.callThrough();
			underTest.startExport();
			var outputOptions = storageApi.poll.calls.mostRecent().args[1],
				errorOptions = storageApi.poll.calls.first().args[1];
			expect(outputOptions.sleepPeriod).toEqual(2000);
			expect(errorOptions.sleepPeriod).toEqual(5000);
			expect(storageApi.poll).toHaveBeenCalledWith('outputlisturl', jasmine.any(Object));
			expect(storageApi.poll).toHaveBeenCalledWith('errorlisturl', jasmine.any(Object));
		});

		it('export is marked as not stopped until deferred object is resolved', function () {
			spyOn(storageApi, 'poll').and.callThrough();
			underTest.startExport();
			expect(laststorageApiCallFor('outputlisturl').args[1].stoppedSemaphore()).toBeFalsy();
		});
		it('export is marked as stopped after promise is resolved', function () {
			spyOn(storageApi, 'poll').and.callThrough();
			underTest.startExport();
			storageApi.deferred.outputlisturl.resolve('foo');
			expect(laststorageApiCallFor('errorlisturl').args[1].stoppedSemaphore()).toBeTruthy();
		});
		it('resolves promise with signed output url when the storageApi resolves', function () {
			var resolved = jasmine.createSpy('resolved');

			underTest.startExport().then(resolved);

			storageApi.deferred.outputlisturl.resolve();
			expect(resolved).toHaveBeenCalledWith('outputurl');
		});
		it('rejects if the configuationGenerator fails', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i cant get the config';
			configurationGenerator.generateExportConfiguration.and.returnValue(jQuery.Deferred().reject(reason).promise());
			spyOn(storageApi, 'poll').and.callThrough();

			underTest.startExport().fail(fail);

			expect(fail).toHaveBeenCalledWith(reason, undefined);
			expect(storageApi.poll).not.toHaveBeenCalled();
		});
		it('rejects if the error storageApi poll resolves before the result storageApi poll', function () {
			var resolved = jasmine.createSpy('resolved'),
				url = 'http://www.google.com',
				fail = jasmine.createSpy('fail');

			underTest.startExport().then(resolved, fail);

			storageApi.deferred.errorlisturl.resolve('www.fail.com');
			storageApi.deferred.outputlisturl.resolve(url);

			expect(resolved).not.toHaveBeenCalled();
			expect(fail).toHaveBeenCalledWith('generation-error', requestId);
		});
		it('rejects promise if the storageApi rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';

			underTest.startExport().fail(fail);

			storageApi.deferred.outputlisturl.reject(reason);
			expect(fail).toHaveBeenCalledWith(reason, requestId);
		});
		it('rejects promise if the file system rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';
			storageApi.save.and.returnValue(jQuery.Deferred().reject(reason).promise());
			spyOn(storageApi, 'poll').and.callThrough();

			underTest.startExport().fail(fail);

			expect(fail).toHaveBeenCalledWith(reason, undefined);
			expect(storageApi.poll).not.toHaveBeenCalled();
		});
	});
});
