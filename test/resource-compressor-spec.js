/*global MM, describe, beforeEach, it, expect, MAPJS */
describe('MM.ResourceCompressor', function () {
	'use strict';
	var withResources, underTest, activeContent;
	beforeEach(function () {
		withResources = {
			title: 'test',
			attr: {icon: {url: 'internal:5/1/session1' }},
			ideas: {
				1: {
					attr: {icon: {url: 'internal:7/2/session1' }}
				},
				2: {
					attr: {icon: {url: 'internal:9/2/session2' }}
				},
				3: {
					attr: {icon: {url: 'internal:10' }}
				},
				4: {
					attr: {icon: {url: 'data:11' }}
				}
			},
			resources: {'5/1/session1': 'r1', '7/2/session1': 'r2', '9/2/session2': 'r3', '10': 'r4', '3/3/3': 'toBeRemoved'}
		};
		underTest = new MM.ResourceCompressor('internal');
		activeContent = MAPJS.content(withResources, 'session1');
		underTest.compress(activeContent);
	});
	it('cleans up resources not used in any nodes', function () {
		expect(activeContent.resources['3/3/3']).toBeFalsy();
	});
	it('does not clean up resources used with attr.icon.url in root', function () {
		expect(activeContent.resources['5/1/session1']).toBe('r1');
	});
	it('does not clean up resources used with attr.icon.url in children', function () {
		expect(activeContent.resources['7/2/session1']).toBe('r2');
	});
	it('converts non-resource URLs into resource URLs', function () {
		var url = activeContent.ideas[4].attr.icon.url;
		expect(url).toMatch(/internal:.*\/session1/);
		expect(activeContent.resources[url.substring(9)]).toBe('data:11');
	});
	it('does not touch resource URLs', function () {
		expect(activeContent.ideas[3].attr.icon.url).toBe('internal:10');
	});
});

