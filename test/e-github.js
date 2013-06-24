/*global describe, it, expect, beforeEach, afterEach, MM, window, spyOn, jQuery, window, jasmine*/
describe("Github integration", function () {
	'use strict';
	describe("MM.GithubAPI", function () {
		describe("loadFile", function () {
			var underTest, sessionStorage, done, rejected;
			beforeEach(function () {
				sessionStorage = {github_auth_token: 'x'};
				underTest = new MM.GithubAPI(sessionStorage);
				done = jasmine.createSpy('done');
				rejected = jasmine.createSpy('rejected');
			});
			it("sends a request to Github V3 API URL using auth token and base64 decodes file contents", function () {
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
			it("rejects with not-authenticated if auth token is blank", function () {
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
	});
});
