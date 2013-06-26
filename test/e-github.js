/*global describe, it, expect, beforeEach, afterEach, MM, window, spyOn, jQuery, window, jasmine, waitsFor, runs*/
describe('Github integration', function () {
	'use strict';
	var underTest, done, rejected, notified;
	beforeEach(function () {
		done = jasmine.createSpy('done');
		rejected = jasmine.createSpy('rejected');
		notified = jasmine.createSpy('notified');
	});
	describe('MM.GitHub.popupWindowLoginLauncher', function () {
		var fakeFrame;
		afterEach(function () {
			fakeFrame.remove();
		});
		beforeEach(function () {
			underTest = MM.GitHub.popupWindowLoginLauncher;
			fakeFrame = jQuery('<iframe>').appendTo('body');
			spyOn(window, 'open').andReturn(fakeFrame[0].contentWindow);
		});
		it('opens a login dialog in a separate frame if allowed to do so', function () {
			underTest().then(done, rejected);
			expect(window.open).toHaveBeenCalled();
			expect(window.open.calls[0].args[0]).toBe('/github/login');
		});
		it('attaches a message listener to the window, resolving when the message with an auth token comes back and setting the session token', function () {
			underTest().then(done, rejected);
			window.postMessage({github_token: 'tkn'}, '*');
			waitsFor(function () {
				return done.callCount;
			}, '', 50);
			runs(function () {
				expect(done).toHaveBeenCalledWith('tkn');
				expect(rejected).not.toHaveBeenCalled();
			});
		});
		it('rejects with error message if postback contains github_error', function () {
			underTest().then(done, rejected);
			window.postMessage({github_error: 'err'}, '*');
			waitsFor(function () {
				return rejected.callCount;
			}, '', 50);
			runs(function () {
				expect(rejected).toHaveBeenCalledWith('failed-authentication', 'err');
				expect(done).not.toHaveBeenCalled();
			});
		});
		it('ignores messages without github_auth_token or github_error', function () {
			var notified = jasmine.createSpy();
			underTest().then(done, rejected, notified);
			window.postMessage({github_xxx: 'err'}, '*');
			waitsFor(function () {
				return notified.callCount;
			}, '', 50);
			runs(function () {
				expect(rejected).not.toHaveBeenCalled();
				expect(done).not.toHaveBeenCalled();
			});
		});
		it('does not unbind after an ignored message', function () {
			underTest().then(done, rejected, notified);
			window.postMessage({github_xxx: 'err'}, '*');

			waitsFor(function () {
				return notified.callCount;
			}, '', 50);
			runs(function () {
				window.postMessage({github_error: 'err'}, '*');
			});
			waitsFor(function () {
				return rejected.callCount;
			}, '', 50);
			runs(function () {
				expect(rejected).toHaveBeenCalledWith('failed-authentication', 'err');
				expect(done).not.toHaveBeenCalled();
			});
		});

	});
	describe('MM.GitHub.GithubAPI', function () {
		var sessionStorage, loginLauncher;
		beforeEach(function () {
			sessionStorage = {github_auth_token: 'x'};
			loginLauncher = jasmine.createSpy('login').andReturn(jQuery.Deferred().promise());
			underTest = new MM.GitHub.GithubAPI(loginLauncher, sessionStorage);
		});
		describe('loadFile', function () {
			it('sends a request to Github V3 API URL using auth token and base64 decodes file contents', function () {
				spyOn(jQuery, 'ajax').andReturn(jQuery.Deferred().resolve({
					content: window.Base64.encode('hey there'),
					name: 'test.mup',
					encoding: 'base64'
				}).promise());
				underTest.loadFile({repo: 'r', path: '/test.mup'}).then(done, rejected);
				expect(done).toHaveBeenCalledWith('hey there', 'application/json');
				expect(jQuery.ajax).toHaveBeenCalledWith(
					{ url : 'https://api.github.com/repos/r/contents/test.mup', type : 'GET', headers : { Authorization : 'bearer x' } }
				);
				expect(rejected).not.toHaveBeenCalled();
			});
			it('attaches branch as a ?ref= to the URL if defined', function () {
				spyOn(jQuery, 'ajax').andReturn(jQuery.Deferred().promise());
				underTest.loadFile({repo: 'r', path: '/test.mup', branch: 'bbb'}).then(done, rejected);
				expect(jQuery.ajax).toHaveBeenCalledWith(
					{ url : 'https://api.github.com/repos/r/contents/test.mup?ref=bbb', type : 'GET', headers : { Authorization : 'bearer x' } }
				);
			});
			it('rejects with not-authenticated if auth token is blank', function () {
				delete sessionStorage.github_auth_token;
				underTest.loadFile({repo: 'r', path: '/test.mup'}).then(done, rejected);
				expect(done).not.toHaveBeenCalled();
				expect(rejected).toHaveBeenCalledWith('not-authenticated');
			});
			it('resolves with mime-type appliction/x-freemind for .mm files', function () {
				spyOn(jQuery, 'ajax').andReturn(jQuery.Deferred().resolve({
					content: window.Base64.encode('hey there'),
					name: 'test.mm',
					encoding: 'base64'
				}).promise());
				underTest.loadFile({}).then(done);
				expect(done).toHaveBeenCalledWith('hey there', 'application/x-freemind');
			});
			it('resolves with mime-type appliction/octet-stream for unrecognised extensions', function () {
				spyOn(jQuery, 'ajax').andReturn(jQuery.Deferred().resolve({
					content: window.Base64.encode('hey there'),
					name: 'test.mxm',
					encoding: 'base64'
				}).promise());
				underTest.loadFile({}).then(done);
				expect(done).toHaveBeenCalledWith('hey there', 'application/octet-stream');
			});
			it('rejects with format-error if encoding is not base64', function () {
				spyOn(jQuery, 'ajax').andReturn(jQuery.Deferred().resolve({
					content: window.Base64.encode('hey there'),
					name: 'test.mm',
					encoding: 'base65'
				}).promise());
				underTest.loadFile({}).then(done, rejected);
				expect(rejected).toHaveBeenCalledWith('format-error', 'Unknown encoding base65');
				expect(done).not.toHaveBeenCalled();
			});
		});
		describe('saveFile', function () {
			beforeEach(function () {
				spyOn(jQuery, 'ajax').andReturn(jQuery.Deferred().promise());
			});
			it('commits a new file without a SHA tag using PUT', function () {
				jQuery.ajax.andReturn(jQuery.Deferred().reject().promise());
				underTest.saveFile('abcd', {repo: 'r', path: 'p.txt'}, 'commit msg');
				expect(jQuery.ajax).toHaveBeenCalledWith({
					url: 'https://api.github.com/repos/r/contents/p.txt',
					type : 'PUT',
					headers : { Authorization : 'bearer x' },
					data : '{"content":"' + window.Base64.encode('abcd') + '","message":"commit msg","sha":""}',
					processData : false
				});
			});
			it('commits an existing file with the previous sha tag SHA tag using PUT', function () {
				jQuery.ajax.andReturn(jQuery.Deferred().resolve({sha: 'oldsha'}).promise());
				underTest.saveFile('abcd', {repo: 'r', path: 'p.txt'}, 'commit msg');
				expect(jQuery.ajax).toHaveBeenCalledWith({
					url: 'https://api.github.com/repos/r/contents/p.txt',
					type : 'PUT',
					headers : { Authorization : 'bearer x' },
					data : '{"content":"' + window.Base64.encode('abcd') + '","message":"commit msg","sha":"oldsha"}',
					processData : false
				});
			});
			it('attaches the branch to PUT request as a branch data arg if defined', function () {
				jQuery.ajax.andReturn(jQuery.Deferred().resolve({sha: 'oldsha'}).promise());
				underTest.saveFile('abcd', {repo: 'r', branch: 'someb', path: 'p.txt'}, 'commit msg');
				expect(jQuery.ajax).toHaveBeenCalledWith({
					url: 'https://api.github.com/repos/r/contents/p.txt',
					type : 'PUT',
					headers : { Authorization : 'bearer x' },
					data : '{"content":"' + window.Base64.encode('abcd') + '","message":"commit msg","sha":"oldsha","branch":"someb"}',
					processData : false
				});
			});
			it('resolves successful completion', function () {
				jQuery.ajax.andReturn(jQuery.Deferred().resolve({sha: 'oldsha'}).promise());
				underTest.saveFile('abcd', {repo: 'r', branch: 'someb', path: 'p.txt'}, 'commit msg').then(done, rejected);
				expect(done).toHaveBeenCalled();
				expect(rejected).not.toHaveBeenCalled();
			});
			it('rejects unsuccessful completion', function () {
				jQuery.ajax.andReturn(jQuery.Deferred().reject().promise());
				underTest.saveFile('abcd', {repo: 'r', branch: 'someb', path: 'p.txt'}, 'commit msg').then(done, rejected);
				expect(rejected).toHaveBeenCalled();
				expect(done).not.toHaveBeenCalled();
			});
		});
		describe('login', function () {

			describe('when auth token is defined', function () {
				it('resolves immediately without opening a popup when auth token is defined', function () {
					underTest.login().then(done, rejected);
					expect(done).toHaveBeenCalled();
					expect(rejected).not.toHaveBeenCalled();
					expect(loginLauncher).not.toHaveBeenCalled();
				});
				it('resolves immediately without opening a popup even if popup allowed when auth token is defined', function () {
					underTest.login(true).then(done, rejected);
					expect(done).toHaveBeenCalled();
					expect(rejected).not.toHaveBeenCalled();
					expect(loginLauncher).not.toHaveBeenCalled();
				});
			});
			describe('when auth token is not defined', function () {
				beforeEach(function () {
					delete sessionStorage.github_auth_token;
				});
				it('fails with not-authenticated when auth token is not defined but popups not allowed', function () {
					underTest.login().then(done, rejected);
					expect(done).not.toHaveBeenCalled();
					expect(rejected).toHaveBeenCalledWith('not-authenticated');
					expect(loginLauncher).not.toHaveBeenCalled();
				});
				it('opens a login dialog in a separate frame if allowed to do so', function () {
					underTest.login(true).then(done, rejected);
					expect(done).not.toHaveBeenCalled();
					expect(rejected).not.toHaveBeenCalled();
					expect(loginLauncher).toHaveBeenCalled();
				});
				it('stores token and resolves when login launcher resolves', function () {
					loginLauncher.andReturn(jQuery.Deferred().resolve('tkn').promise());
					underTest.login(true).then(done, rejected);
					expect(done).toHaveBeenCalled();
					expect(rejected).not.toHaveBeenCalled();
					expect(sessionStorage.github_auth_token).toBe('tkn');
				});
				it('rejects when login launcher rejects', function () {
					loginLauncher.andReturn(jQuery.Deferred().reject().promise());
					underTest.login(true).then(done, rejected);
					expect(rejected).toHaveBeenCalled();
					expect(done).not.toHaveBeenCalled();
					expect(sessionStorage.github_auth_token).toBeFalsy();
				});
			});
		});
	});
});
