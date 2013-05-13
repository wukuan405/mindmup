/*global beforeEach, afterEach, describe, expect, it, MM, $, spyOn, jasmine*/
describe('MM.navigation', function () {
	'use strict';
	var underTest;
	beforeEach(function () {
		localStorage.clear();
		underTest = new MM.navigation(localStorage);
		localStorage.setItem('mostRecentMapLoaded', 'most recent');
	});
	afterEach(function () {
		window.removeEventListener('mapIdChanged');
		window.location.hash = '';
	});
});