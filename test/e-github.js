/*global describe, it, expect, beforeEach, afterEach, MM, window, spyOn, jQuery, window, jasmine, sinon, _*/
describe('Github integration', function () {
	'use strict';
	var underTest, done, rejected, notified;
	beforeEach(function () {
		done = jasmine.createSpy('done');
		rejected = jasmine.createSpy('rejected');
		notified = jasmine.createSpy('notified');
	});
	describe('MM.GitHub.popupWindowLoginLauncher', function () {
		var fakeFrame, clock;
		beforeEach(function () {
			clock = sinon.useFakeTimers();
		});
		afterEach(function () {
			clock.restore();
		});
		beforeEach(function () {
			underTest = MM.GitHub.popupWindowLoginLauncher;
			fakeFrame = {};
			spyOn(window, 'open').andReturn(fakeFrame);
		});
		it('opens a login dialog in a separate frame if allowed to do so', function () {
			underTest().then(done, rejected);
			expect(window.open).toHaveBeenCalled();
			expect(window.open.calls[0].args[0]).toBe('/github/login');
		});
		it('attaches a message listener to window.MMGithubCallBack, resolving when the message with an auth token comes back and setting the session token', function () {
			underTest().then(done, rejected);
			window.MMGithubCallBack({github_token: 'tkn'});
			expect(done).toHaveBeenCalledWith('tkn');
			expect(rejected).not.toHaveBeenCalled();
		});
		it('rejects with error message if postback contains github_error', function () {
			underTest().then(done, rejected);
			window.MMGithubCallBack({github_error: 'err'});
			expect(rejected).toHaveBeenCalledWith('failed-authentication', 'err');
			expect(done).not.toHaveBeenCalled();
		});
		it('ignores messages without github_auth_token or github_error', function () {
			var notified = jasmine.createSpy();
			underTest().then(done, rejected, notified);
			window.MMGithubCallBack({github_xxx: 'err'});
			expect(rejected).not.toHaveBeenCalled();
			expect(done).not.toHaveBeenCalled();
		});
		it('does not unbind after an ignored message', function () {
			underTest().then(done, rejected, notified);
			window.MMGithubCallBack({github_xxx: 'err'});
			window.MMGithubCallBack({github_error: 'err'});
			expect(rejected).toHaveBeenCalledWith('failed-authentication', 'err');
			expect(done).not.toHaveBeenCalled();
		});
		it('does nothing if no message is resolved and the window is still open', function () {
			underTest().then(done, rejected);
			clock.tick(1000);
			expect(rejected).not.toHaveBeenCalled();
			expect(done).not.toHaveBeenCalled();
		});
		it('rejects when the popup is closed', function () {
			underTest().then(done, rejected);
			fakeFrame.closed = true;
			clock.tick(1000);
			expect(rejected).toHaveBeenCalledWith('user-cancel');
			expect(done).not.toHaveBeenCalled();
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
			it('asks for an existing file using ?ref as a branch', function () {
				jQuery.ajax.andReturn(jQuery.Deferred().resolve({sha: 'oldsha'}).promise());
				underTest.saveFile('abcd', {repo: 'r', path: 'p.txt', branch: 'br'}, 'commit msg');
				expect(jQuery.ajax).toHaveBeenCalledWith({
					url: 'https://api.github.com/repos/r/contents/p.txt?ref=br',
					type : 'GET',
					headers : { Authorization : 'bearer x' },
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
		describe('ajax requests', function () {
			var ajaxCall;
			beforeEach(function () {
				ajaxCall = jQuery.Deferred();
				spyOn(jQuery, 'ajax').andReturn(ajaxCall.promise());
			});
			describe('general error control', function () {
				var ajaxGetters = _.functions(new MM.GitHub.GithubAPI()).filter(function (name) {return (/^get/).test(name); });
				ajaxGetters.forEach(function (name) {
					it(name + ' rejects if not authenticated', function () {
						delete sessionStorage.github_auth_token;
						underTest[name]().then(done, rejected);
						expect(rejected).toHaveBeenCalledWith('not-authenticated');
					});
					it(name + ' rejects if ajax call fails', function () {
						ajaxCall.reject();
						underTest[name]().then(done, rejected);
						expect(rejected).toHaveBeenCalled();
					});
				});
			});
			describe('getRepositories', function () {
				it('retrieves logged in users repositories when no params given', function () {
					underTest.getRepositories().then(done, rejected);
					expect(jQuery.ajax).toHaveBeenCalledWith({
						url : 'https://api.github.com/user/repos',
						type : 'GET',
						headers : { Authorization : 'bearer x' }
					});
				});
				it('retrieves repositories of the user specified in the first arg', function () {
					underTest.getRepositories('my').then(done, rejected);
					expect(jQuery.ajax).toHaveBeenCalledWith({
						url : 'https://api.github.com/users/my/repos',
						type : 'GET',
						headers : { Authorization : 'bearer x' }
					});
				});
				it('retrieves org repositories if the second argument is org', function () {
					underTest.getRepositories('my', 'org').then(done, rejected);
					expect(jQuery.ajax).toHaveBeenCalledWith({
						url : 'https://api.github.com/orgs/my/repos',
						type : 'GET',
						headers : { Authorization : 'bearer x' }
					});
				});
				it('transforms resulting github data into a list of repos', function () {
					var githubData = [
						{ full_name: 'n1', default_branch: 'b1'},
						{ full_name: 'n2', default_branch: 'b2'}
					];
					ajaxCall.resolve(githubData);
					underTest.getRepositories().then(done, rejected);
					expect(done).toHaveBeenCalledWith([
						{ type: 'repo', name: 'n1', defaultBranch: 'b1' },
						{ type: 'repo', name: 'n2', defaultBranch: 'b2' }
					]);
				});
			});
			describe('getBranches', function () {
				it('flattens the list of branches into an array of branch names', function () {
					ajaxCall.resolve([{name: 'a' }, {name: 'b'}]);
					underTest.getBranches('repo1').then(done, rejected);
					expect(jQuery.ajax).toHaveBeenCalledWith({
						url: 'https://api.github.com/repos/repo1/branches',
						type : 'GET',
						headers : { Authorization : 'bearer x' }
					});
					expect(done).toHaveBeenCalledWith(['a', 'b']);
				});
			});
			describe('getFiles', function () {
				it('retrieves a list of files or folders on a component path', function () {
					var dirList = [
						{type: 'file', name: 'a.txt', path: '/a.txt' },
						{type: 'dir', name: 'b', path: '/b'}
					];
					ajaxCall.resolve(dirList);
					underTest.getFiles({repo: 'repo1', branch: 'branch1', path: 'path1'}).then(done, rejected);
					expect(jQuery.ajax).toHaveBeenCalledWith({
						url: 'https://api.github.com/repos/repo1/contents/path1?ref=branch1',
						type : 'GET',
						headers : { Authorization : 'bearer x' }
					});
					expect(done).toHaveBeenCalledWith(dirList);
				});
			});
			describe('getOrgs', function () {
				it('retrieves a list of organisations for the current user', function () {
					ajaxCall.resolve([{login: 'a'}, {login: 'b'}]);
					underTest.getOrgs().then(done, rejected);
					expect(jQuery.ajax).toHaveBeenCalledWith({
						url: 'https://api.github.com/user/orgs',
						type : 'GET',
						headers : { Authorization : 'bearer x' }
					});
					expect(done).toHaveBeenCalledWith([
						{type: 'org', name: 'a'},
						{type: 'org', name: 'b'}
					]);
				});
			});
			describe('getUser', function () {
				it('retrieves current user', function () {
					ajaxCall.resolve({login: 'a'});
					underTest.getUser().then(done, rejected);
					expect(jQuery.ajax).toHaveBeenCalledWith({
						url: 'https://api.github.com/user',
						type : 'GET',
						headers : { Authorization : 'bearer x' }
					});
					expect(done).toHaveBeenCalledWith({type: 'user', name: 'a'});
				});
			});
		});
	});
	describe('MM.GitHub.GithubFileSystem', function () {
		var api, commitPrompter, fileNamePrompter, loginCall, loadFileCall, mapId, content, saveFileCall,
			promptForCommitCall, promptForFileNameCall;
		beforeEach(function () {
			loginCall = jQuery.Deferred();
			loadFileCall = jQuery.Deferred();
			saveFileCall = jQuery.Deferred();
			promptForCommitCall = jQuery.Deferred();
			promptForFileNameCall = jQuery.Deferred();
			api = {
				login: jasmine.createSpy('login').andReturn(loginCall.promise()),
				loadFile: jasmine.createSpy('loadFile').andReturn(loadFileCall.promise()),
				saveFile: jasmine.createSpy('saveFile').andReturn(saveFileCall.promise())
			};
			commitPrompter = {
				promptForCommit: jasmine.createSpy('promptForComit').andReturn(promptForCommitCall.promise())
			};
			fileNamePrompter = {
				promptForFileName: jasmine.createSpy('promptForFileName').andReturn(promptForFileNameCall.promise())
			};
			mapId = 'h1REPO:BRANCH:PATH';
			underTest = new MM.GitHub.GithubFileSystem(api, commitPrompter, fileNamePrompter);
			content = 'xcontentabc';
		});
		describe('loadMap', function () {
			it('propagates API login rejects without asking for a file', function () {
				loginCall.reject('not-authenticated');
				underTest.loadMap('x', false).then(done, rejected);
				expect(api.login).toHaveBeenCalledWith(false);
				expect(rejected).toHaveBeenCalledWith('not-authenticated');
				expect(api.loadFile).not.toHaveBeenCalled();
			});
			it('passes showAuthDialogs to login', function () {
				underTest.loadMap('x', true).then(done, rejected);
				expect(api.login).toHaveBeenCalledWith(true);
			});
			it('decomposes a colon-separated url into a component url and asks for that file if login succeeded', function () {
				loginCall.resolve();
				underTest.loadMap(mapId, true);
				expect(api.loadFile).toHaveBeenCalledWith({repo: 'REPO', branch: 'BRANCH', path: 'PATH'});
			});
			it('propagates file retrieval failure', function () {
				loginCall.resolve();
				loadFileCall.reject('failed');
				underTest.loadMap(mapId, true).then(done, rejected);
				expect(rejected).toHaveBeenCalledWith('failed');
			});
			it('propagates file retrieval success', function () {
				loginCall.resolve();
				loadFileCall.resolve(content, 'mime');
				underTest.loadMap(mapId, true).then(done, rejected);
				expect(done).toHaveBeenCalledWith(content, 'h1REPO:BRANCH:PATH', 'mime', {});
			});
			it('propagates file retrieval progress', function () {
				loginCall.resolve();
				loadFileCall.notify('99%');
				underTest.loadMap(mapId, true).then(done, rejected, notified);
				expect(notified).toHaveBeenCalledWith('99%');
			});
		});
		describe('saveMap', function () {
			var fileName = 'fname.txt';
			it('passes showAuthDialogs to login', function () {
				underTest.saveMap(content, mapId, fileName, true).then(done, rejected);
				expect(api.login).toHaveBeenCalledWith(true);
			});
			it('propagates API login rejects without sending a file', function () {
				loginCall.reject('not-authenticated');
				underTest.saveMap(content, mapId, fileName, false).then(done, rejected);
				expect(api.login).toHaveBeenCalledWith(false);
				expect(rejected).toHaveBeenCalledWith('not-authenticated');
				expect(api.saveFile).not.toHaveBeenCalled();
			});
			describe('when logged in', function () {
				beforeEach(function () {
					loginCall.resolve();
				});
				it('prompts for a file name if map ID is not specified (new file scenario)', function () {
					underTest.saveMap(content, 'h1', fileName, false).then(done, rejected);
					expect(fileNamePrompter.promptForFileName).toHaveBeenCalledWith('Save to Github', true, fileName);
					expect(commitPrompter.promptForCommit).not.toHaveBeenCalled();
					expect(api.saveFile).not.toHaveBeenCalled();
				});
				it('prompts for a file name if map ID is not recognised (moving from a different repo scenario)', function () {
					underTest.saveMap(content, 'g1:a:b:c', fileName, false).then(done, rejected);
					expect(fileNamePrompter.promptForFileName).toHaveBeenCalledWith('Save to Github', true, fileName);
					expect(commitPrompter.promptForCommit).not.toHaveBeenCalled();
					expect(api.saveFile).not.toHaveBeenCalled();
				});
				it('does not prompt for a file name if map ID is recognisable (existing file scenario)', function () {
					underTest.saveMap(content, mapId, fileName, false).then(done, rejected);
					expect(fileNamePrompter.promptForFileName).not.toHaveBeenCalled();
					expect(api.saveFile).not.toHaveBeenCalled();
				});
				it('rejects if file name prompt fails', function () {
					promptForFileNameCall.reject('fail');
					underTest.saveMap(content, 'h1', fileName, false).then(done, rejected);
					expect(api.saveFile).not.toHaveBeenCalled();
					expect(rejected).toHaveBeenCalledWith('fail');
				});
				it('prompts for commit immediately if map ID is recognisable', function () {
					underTest.saveMap(content, mapId, fileName, false).then(done, rejected);
					expect(commitPrompter.promptForCommit).toHaveBeenCalled();
					expect(api.saveFile).not.toHaveBeenCalled();
				});
				it('rejects if commit prompt fails', function () {
					promptForCommitCall.reject('fail');
					underTest.saveMap(content, mapId, fileName, false).then(done, rejected);
					expect(rejected).toHaveBeenCalled();
					expect(api.saveFile).not.toHaveBeenCalledWith('fail');
				});
				it('prompts for commit after the file prompt is resolved if map ID is not recognisable', function () {
					promptForFileNameCall.resolve(mapId);
					underTest.saveMap(content, 'h1', fileName, false).then(done, rejected);
					expect(commitPrompter.promptForCommit).toHaveBeenCalled();
					expect(api.saveFile).not.toHaveBeenCalled();
				});
				describe('when all prompts resolve', function () {
					beforeEach(function () {
						promptForFileNameCall.resolve(mapId);
						promptForCommitCall.resolve('commit msg');
					});
					it('calls saveFile once commit resolution ends', function () {
						underTest.saveMap(content, 'h1', fileName, false).then(done, rejected);
						expect(api.saveFile).toHaveBeenCalledWith(content, { repo : 'REPO', branch : 'BRANCH', path : 'PATH' }, 'commit msg');
					});
					it('resolves when saveFile resolves', function () {
						saveFileCall.resolve();
						underTest.saveMap(content, 'h1', fileName, false).then(done, rejected);
						expect(done).toHaveBeenCalledWith(mapId, {});
					});
					it('propagates saveFile rejections', function () {
						saveFileCall.reject();
						underTest.saveMap(content, 'h1', fileName, false).then(done, rejected);
						expect(rejected).toHaveBeenCalled();
					});
					it('propagates saveFile notifications', function () {
						saveFileCall.reject();
						underTest.saveMap(content, 'h1', fileName, false).then(done, rejected);
						expect(rejected).toHaveBeenCalled();
					});
				});
				describe('when commit resolves and map ID was recognisable', function () {
					beforeEach(function () {
						promptForCommitCall.resolve('commit msg');
					});
					it('calls saveFile once commit resolution ends', function () {
						underTest.saveMap(content, mapId, fileName, false).then(done, rejected);
						expect(api.saveFile).toHaveBeenCalledWith(content, { repo : 'REPO', branch : 'BRANCH', path : 'PATH' }, 'commit msg');
					});
					it('resolves when saveFile resolves', function () {
						saveFileCall.resolve();
						underTest.saveMap(content, mapId, fileName, false).then(done, rejected);
						expect(done).toHaveBeenCalledWith(mapId, {});
					});
					it('propagates saveFile rejections', function () {
						saveFileCall.reject();
						underTest.saveMap(content, mapId, fileName, false).then(done, rejected);
						expect(rejected).toHaveBeenCalled();
					});
					it('propagates saveFile notifications', function () {
						saveFileCall.reject('fail');
						underTest.saveMap(content, mapId, fileName, false).then(done, rejected);
						expect(rejected).toHaveBeenCalledWith('fail');
					});
				});
			});

		});
	});
});
