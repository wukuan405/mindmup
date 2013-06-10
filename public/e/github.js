/*global $, Gh3, document, MM */
MM.GithubFileSource = function () {
	'use strict';
	var self = this;
	self.login = function () {
		document.location = '/github/login';
	};
};
