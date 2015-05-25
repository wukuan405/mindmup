/* global jasmine, beforeEach, it, describe, expect, jQuery, spyOn,  MM, _*/
describe('LayoutExport', function () {
	'use strict';
	describe('LayoutExportController', function () {
		var configurationGenerator, exportFunctions, currentLayout, underTest, requestId, storageApi, activityLog, saveConfiguration, saveOptions,
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
			exportFunctions = { };
			activityLog = jasmine.createSpyObj('activityLog', ['log', 'timer']);
			activityLog.timer.and.returnValue(timer);
			currentLayout = { 'a': 'b' };
			configurationGenerator.generateExportConfiguration = jasmine.createSpy('saveMap');
			configurationGenerator.generateExportConfiguration.and.returnValue(
				jQuery.Deferred().resolve(saveConfiguration).promise()
			);

			exportFunctions.pdf = jasmine.createSpy('getCurrentLayout');
			exportFunctions.pdf.and.returnValue(currentLayout);
			storageApi = buildStorageApi();
			underTest = new MM.LayoutExportController(exportFunctions, configurationGenerator, storageApi, activityLog);

		});
		it('pulls out the export from the export function for the selected format, passes the format to the configuration generator, and publishes JSON version of that to the storageApi', function () {
			underTest.startExport('pdf');
			expect(configurationGenerator.generateExportConfiguration).toHaveBeenCalledWith('pdf');
			expect(storageApi.save).toHaveBeenCalledWith(JSON.stringify(currentLayout), saveConfiguration, saveOptions);
		});
		describe('format configurations', function () {
			var processorDeferred, resolved, postProcessor, rejected;
			beforeEach(function () {
				processorDeferred = jQuery.Deferred();
				postProcessor = jasmine.createSpy('postProcessor').and.returnValue(processorDeferred.promise());
				resolved = jasmine.createSpy('resolved');
				rejected = jasmine.createSpy('rejected');
				underTest = new MM.LayoutExportController({
					'ppt': function () {
						return {what: 'PPT'};
					},
					'pdf': {exporter: function () {
						return {what: 'PDF'};
					}, processor: postProcessor }
				}, configurationGenerator, storageApi, activityLog);
			});
			describe('with just an exporter function and no processor', function () {
				it('use the export function to generate content to send to the storage API', function () {
					underTest.startExport('ppt');
					expect(storageApi.save).toHaveBeenCalledWith('{"what":"PPT"}', saveConfiguration, saveOptions);
				});
				it('do not post-process results before resolving, but return a hash with output-url', function () {
					var resolved = jasmine.createSpy('resolved');
					underTest.startExport('ppt').then(resolved);
					storageApi.deferred.outputlisturl.resolve();
					expect(resolved).toHaveBeenCalledWith({ 'output-url': 'outputurl' }, requestId);
				});
			});
			describe('with an exporter and a processor', function () {
				it('use the export function to generate content to send to the storage API', function () {
					underTest.startExport('pdf');
					expect(storageApi.save).toHaveBeenCalledWith('{"what":"PDF"}', saveConfiguration, saveOptions);
				});
				it('do not resolve immediately when storage api resolves, but instead kick off the post-processor', function () {
					underTest.startExport('pdf').then(resolved);
					storageApi.deferred.outputlisturl.resolve();
					expect(resolved).not.toHaveBeenCalled();
					expect(postProcessor).toHaveBeenCalledWith({'output-url': 'outputurl'});
				});
				it('resolve when the post-processor resolves', function () {
					underTest.startExport('pdf').then(resolved);
					storageApi.deferred.outputlisturl.resolve();
					processorDeferred.resolve({hi: 'there'});
					expect(resolved).toHaveBeenCalledWith({hi:'there'}, requestId);
				});
				it('reject if the post-processor rejects', function () {
					underTest.startExport('pdf').then(resolved, rejected);
					storageApi.deferred.outputlisturl.resolve();
					processorDeferred.reject('network-error');
					expect(rejected).toHaveBeenCalledWith('network-error', requestId);
				});
			});
		});
		it('merges any object passed with the current map model layout, and publishes JSON version of that to an fileSystem, leaving current layout unchanged', function () {
			underTest.startExport('pdf', {'foo': 'bar'});
			expect(storageApi.save).toHaveBeenCalledWith(JSON.stringify({'a': 'b', 'foo': 'bar'}), saveConfiguration, saveOptions);
			expect(currentLayout).toEqual({'a': 'b'});
		});
		it('immediately rejects with an error if the export result is empty', function () {
			var rejected = jasmine.createSpy('rejected');
			exportFunctions.pdf.and.returnValue({});
			underTest.startExport('pdf', {'foo': 'bar'}).fail(rejected);
			expect(storageApi.save).not.toHaveBeenCalled();
			expect(rejected).toHaveBeenCalledWith('empty');
		});
		it('polls for result and error when the request is started', function () {
			spyOn(storageApi, 'poll').and.callThrough();
			underTest.startExport('pdf');
			var outputOptions = storageApi.poll.calls.mostRecent().args[1],
				errorOptions = storageApi.poll.calls.first().args[1];
			expect(outputOptions.sleepPeriod).toEqual(2500);
			expect(errorOptions.sleepPeriod).toEqual(15000);
			expect(storageApi.poll).toHaveBeenCalledWith('outputlisturl', jasmine.any(Object));
			expect(storageApi.poll).toHaveBeenCalledWith('errorlisturl', jasmine.any(Object));
		});

		it('export is marked as not stopped until deferred object is resolved', function () {
			spyOn(storageApi, 'poll').and.callThrough();
			underTest.startExport('pdf');
			expect(laststorageApiCallFor('outputlisturl').args[1].stoppedSemaphore()).toBeFalsy();
		});
		it('export is marked as stopped after promise is resolved', function () {
			spyOn(storageApi, 'poll').and.callThrough();
			underTest.startExport('pdf');
			storageApi.deferred.outputlisturl.resolve('foo');
			expect(laststorageApiCallFor('errorlisturl').args[1].stoppedSemaphore()).toBeTruthy();
		});
		it('resolves promise with signed output url when the storageApi resolves', function () {
			var resolved = jasmine.createSpy('resolved');

			underTest.startExport('pdf').then(resolved);

			storageApi.deferred.outputlisturl.resolve();
			expect(resolved).toHaveBeenCalledWith({'output-url': 'outputurl'}, requestId);
		});
		it('rejects if the configuationGenerator fails', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i cant get the config';
			configurationGenerator.generateExportConfiguration.and.returnValue(jQuery.Deferred().reject(reason).promise());
			spyOn(storageApi, 'poll').and.callThrough();

			underTest.startExport('pdf').fail(fail);

			expect(fail).toHaveBeenCalledWith(reason, undefined);
			expect(storageApi.poll).not.toHaveBeenCalled();
		});
		it('rejects if the error storageApi poll resolves before the result storageApi poll', function () {
			var resolved = jasmine.createSpy('resolved'),
				url = 'http://www.google.com',
				fail = jasmine.createSpy('fail');

			underTest.startExport('pdf').then(resolved, fail);

			storageApi.deferred.errorlisturl.resolve('www.fail.com');
			storageApi.deferred.outputlisturl.resolve(url);

			expect(resolved).not.toHaveBeenCalled();
			expect(fail).toHaveBeenCalledWith('generation-error', requestId);
		});
		it('rejects promise if the storageApi rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';

			underTest.startExport('pdf').fail(fail);

			storageApi.deferred.outputlisturl.reject(reason);
			expect(fail).toHaveBeenCalledWith(reason, requestId);
		});
		it('rejects promise with if the file system rejects', function () {
			var fail = jasmine.createSpy('fail'),
				reason = 'cos i said so';
			storageApi.save.and.returnValue(jQuery.Deferred().reject(reason).promise());
			spyOn(storageApi, 'poll').and.callThrough();

			underTest.startExport('pdf').fail(fail);

			expect(fail).toHaveBeenCalledWith('cos i said so', undefined);
			expect(storageApi.poll).not.toHaveBeenCalled();
		});
	});
});
describe('MM.buildMapLayoutExporter', function () {
	'use strict';
	var underTest, mapModel, resourceTranslator;
	beforeEach(function () {
		mapModel = jasmine.createSpyObj('mapModel', ['getCurrentLayout']);
		resourceTranslator = function (x) {
			return 'get+' + x;
		};
		underTest = MM.buildMapLayoutExporter(mapModel, resourceTranslator);
	});
	it('replaces all icon URLs in the layout nodes with resource URLs', function () {
		mapModel.getCurrentLayout.and.returnValue({nodes: { 1: { title: 'first', attr: {icon: { url: 'x1'}}}, 2: {title: 'no icon'}, 3: { title: 'another', attr: {icon: { url: 'x2'}}}}});
		expect(underTest()).toEqual({nodes: { 1: { title: 'first', attr: {icon: { url: 'get+x1'}}}, 2: {title: 'no icon'}, 3: { title: 'another', attr: {icon: { url: 'get+x2'}}}}});
	});
	it('survives no nodes', function () {
		mapModel.getCurrentLayout.and.returnValue({links: []});
		expect(underTest()).toEqual({links: []});
	});
});
describe('MM.buildDecoratedResultProcessor', function () {
	'use strict';
	var one, two, three, deferredOne, underTest, resolved, rejected;
	beforeEach(function () {
		resolved = jasmine.createSpy('resolved');
		rejected = jasmine.createSpy('rejected');
		deferredOne = jQuery.Deferred();
		one = jasmine.createSpy('one').and.returnValue(deferredOne.promise());
		two = function (r) {
			r.two = true;
		};
		three = function (r) {
			r.three = true;
		};
		underTest = MM.buildDecoratedResultProcessor(one, [two, three]);
	});
	it('executes a deferred result processor first', function () {
		underTest({start: 1}).then(resolved, rejected);
		expect(one).toHaveBeenCalledWith({start: 1});
		deferredOne.resolve({one: true});
		expect(resolved).toHaveBeenCalled();
	});
	it('synchronously applies a chain of decorators to the result', function () {
		underTest({start: 1}).then(resolved, rejected);
		deferredOne.resolve({one: true});
		expect(resolved).toHaveBeenCalledWith({one: true, two: true, three: true});
	});
	it('rejects if a deferred result processor rejects', function () {
		underTest({start: 1}).then(resolved, rejected);
		deferredOne.reject('oops');
		expect(rejected).toHaveBeenCalledWith('oops');
	});
});
describe('MM.layoutExportDecorators', function () {
	'use strict';
	var result;
	beforeEach(function () {
		result = {'index-html': 'www.foo.com/index.html', export: {title: 'hoo har title', description: 'hoo har' }, 'archive-zip': 'www.foo.com/archive.zip'};
	});
	describe('gmailResultDecorator', function () {
		it('should add a gmail link into the result', function () {
			MM.layoutExportDecorators.gmailResultDecorator(result);
			expect(result['gmail-index-html']).toEqual('https://mail.google.com/mail/u/0/?view=cm&ui=2&cmid=0&fs=1&tf=1&body=hoo%20har%20title%0A%0Awww.foo.com%2Findex.html');
		});
	});
	describe('emailResultDecorator', function () {
		it('should add a email link into the result', function () {
			MM.layoutExportDecorators.emailResultDecorator(result);
			expect(result['email-index-html']).toEqual('mailto:?subject=hoo%20har%20title&body=hoo%20har%3A%0D%0A%0D%0Awww.foo.com%2Findex.html');
		});
	});
	describe('gmailZipResultDecorator', function () {
		it('should add a gmail link into the result', function () {
			MM.layoutExportDecorators.gmailZipResultDecorator(result);
			expect(result['gmail-archive-zip']).toEqual('https://mail.google.com/mail/u/0/?view=cm&ui=2&cmid=0&fs=1&tf=1&body=hoo%20har%20title%0A%0Awww.foo.com%2Farchive.zip');
		});
	});
	describe('emailZipResultDecorator', function () {
		it('should add a email link into the result', function () {
			MM.layoutExportDecorators.emailZipResultDecorator(result);
			expect(result['email-archive-zip']).toEqual('mailto:?subject=hoo%20har%20title&body=hoo%20har%3A%0D%0A%0D%0Awww.foo.com%2Farchive.zip');
		});
	});

});
