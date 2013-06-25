/*global describe, it, expect, beforeEach, afterEach, MM, window, spyOn, jQuery, window, jasmine, waitsFor, runs*/
describe('Github integration', function () {
	'use strict';
	describe('MM.GithubAPI', function () {
		var underTest, sessionStorage, done, rejected;
		beforeEach(function () {
			sessionStorage = {github_auth_token: 'x'};
			underTest = new MM.GithubAPI(sessionStorage);
			done = jasmine.createSpy('done');
			rejected = jasmine.createSpy('rejected');
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
			var fakeFrame;
			beforeEach(function () {
				fakeFrame = jQuery('<iframe>').appendTo('body');
				spyOn(window, 'open').andReturn(fakeFrame[0].contentWindow);
			});
			afterEach(function () {
				fakeFrame.remove();
			});
			describe('when auth token is defined', function () {
				it('resolves immediately without opening a popup when auth token is defined', function () {
					underTest.login().then(done, rejected);
					expect(done).toHaveBeenCalled();
					expect(rejected).not.toHaveBeenCalled();
					expect(window.open).not.toHaveBeenCalled();
				});
				it('resolves immediately without opening a popup even if popup allowed when auth token is defined', function () {
					underTest.login(true).then(done, rejected);
					expect(done).toHaveBeenCalled();
					expect(rejected).not.toHaveBeenCalled();
					expect(window.open).not.toHaveBeenCalled();
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
					expect(window.open).not.toHaveBeenCalled();
				});
				it('opens a login dialog in a separate frame if allowed to do so', function () {
					underTest.login(true).then(done, rejected);
					expect(done).not.toHaveBeenCalled();
					expect(rejected).not.toHaveBeenCalled();
					expect(window.open).toHaveBeenCalled();
					expect(window.open.calls[0].args[0]).toBe('/github/login');
				});
				it('attaches a message listener to the popup frame, resolving when the message with an auth token comes back and setting the session token', function () {
					underTest.login(true).then(done, rejected);
					fakeFrame[0].contentWindow.postMessage({github_token: 'tkn'}, '*');
					waitsFor(function () {
						return done.callCount;
					});
					runs(function () {
						expect(done).toHaveBeenCalled();
						expect(rejected).not.toHaveBeenCalled();
						expect(sessionStorage.github_auth_token).toBe('tkn');
					});
				});
				it('rejects with error message if postback contains github_error', function () {
					underTest.login(true).then(done, rejected);
					fakeFrame[0].contentWindow.postMessage({github_error: 'err'}, '*');
					waitsFor(function () {
						return rejected.callCount;
					});
					runs(function () {
						expect(rejected).toHaveBeenCalled();
						expect(done).not.toHaveBeenCalled();
						expect(sessionStorage.github_auth_token).toBeFalsy();
					});
				});
			});
		});
	});
});
