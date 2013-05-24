/*global beforeEach, describe, expect, it, MAPJS, MM*/
describe('MM.ContentStatusUpdater', function () {
	'use strict';
	var underTest, content;
	beforeEach(function () {
		content = MAPJS.content({
			attr: {
				'test-statuses': {
					'passing': {
						style: {
							background: '#ffffff'
						}
					},
					'in-progress': {
						priority: 1,
						style: {
							background: '#00ffff'
						}
					},
					'failure': {
						priority: 999,
						style: {
							background: '#ff0000'
						}
					}

				},
				style: {
					background: '#000000',
					otherStyle: 'foo'
				}
			},
			id: 1,
			ideas: {
				1: {
					id: 11,
					ideas: {
						1: {
							id: 111,
							ideas: {
								1: {
									id: 1111
								}
							}
						},
						2: {
							id: 112
						}
					}
				}
			}
		});
		underTest = new MM.ContentStatusUpdater('test-status', 'test-statuses', content);
	});
	describe('updates the node style:', function () {
		it('should change the node to be the color associated with the status', function () {
			underTest.updateStatus(1, 'passing');

			expect(content.attr.style.background).toBe('#ffffff');
		});
		it('should preserve the existing styles where they are not overridden', function () {
			underTest.updateStatus(1, 'passing');
			expect(content.attr.style.otherStyle).toBe('foo');
		});
		it('should return true if successful', function () {
			expect(underTest.updateStatus(1, 'passing')).toBeTruthy();
		});
		it('should leave the node style unchanged if the style is not recognised', function () {
			expect(underTest.updateStatus(1, 'dodgyStatus')).toBeFalsy();
			expect(content.attr.style).toEqual({
				background: '#000000',
				otherStyle: 'foo'
			});
		});
		it('should return false if idea with id not found', function () {
			expect(underTest.updateStatus(31412, 'passing')).toBeFalsy();
		});
		it('should change the style of non root ideas', function () {
			underTest.updateStatus(11, 'passing');
			expect(content.getAttrById(11, 'style')).toEqual({background: '#ffffff'});
		});
	});
	describe('persists the status', function () {
		it('sets the status attribute', function () {
			underTest.updateStatus(1, 'passing');
			expect(content.getAttrById(1, 'test-status')).toEqual('passing');
		});
	});
	describe('propagates status changes to parents', function () {
		var runs = [
				['',			'in-progress',	'in-progress',		'priority wins over no status'],
				['',			'passing',		'same as before',	'without priority the status does not propagate if there are siblings with no status'],
				['passing',		'passing',		'passing',			'all the child nodes have the same status'],
				['passing',		'in-progress',	'in-progress',		'priority wins over no priority'],
				['in-progress',	'in-progress',	'in-progress',		'same priority propagates'],
				['in-progress',	'failure',		'failure',			'higher priority wins'],
				['failure',		'in-progress',	'failure',			'higher priority wins even if on sibling'],
			],
			checkPropatation = function (sibling, child, expectedParent) {
				content.updateAttr(11, 'test-status', 'same as before');
				content.updateAttr(112, 'test-status', sibling);

				underTest.updateStatus(111, child);

				expect(content.getAttrById(11, 'test-status')).toEqual(expectedParent);
			};
		runs.forEach(function (args) {
			it(args[3], checkPropatation.bind(this, args[0], args[1], args[2]));
		});
		it('propagates all the way to the top', function () {
			underTest.updateStatus(111, 'failure');
			expect(content.getAttrById(11, 'test-status')).toEqual('failure');
			expect(content.getAttrById(1, 'test-status')).toEqual('failure');
		});

		it('evaluates each level independently when propagating', function () {
			content.updateAttr(11, 'test-status', 'same as before');
			content.updateAttr(112, 'test-status', 'failure');

			underTest.updateStatus(1111, 'in-progress');

			expect(content.getAttrById(111, 'test-status')).toEqual('in-progress');
			expect(content.getAttrById(11, 'test-status')).toEqual('failure');
		});
		it('propagates does not propagate down', function () {
			underTest.updateStatus(121, 'failure');
			expect(content.getAttrById(1211, 'test-status')).not.toEqual('failure');
		});

	});
	describe('clear', function () {
		var content, underTest;
		beforeEach(function () {
			content = MAPJS.content({
				id: 1,
				attr: { status: 'yes', style: { background: 'green' } },
				ideas: {
					1: {
						id: 11,
						attr: { status: 'no', style: { background: 'yellow' } },
						ideas: {
							1: {
								id: 111,
								attr: { style: { background: 'yellow' } },
							}
						}
					}
				}
			});
			underTest = new MM.ContentStatusUpdater('status', 'test-statuses', content);
		});
		it('deletes all status attributes and drops styling for any elements with status', function () {
			underTest.clear();
			expect(content.getAttr('status')).toBeFalsy();
			expect(content.getAttr('style')).toBeFalsy();
			expect(content.findSubIdeaById(11).getAttr('status')).toBeFalsy();
			expect(content.findSubIdeaById(11).getAttr('style')).toBeFalsy();
		});
		it('does not drop styling of non-status elements', function () {
			underTest.clear();
			expect(content.findSubIdeaById(111).getAttr('style')).toEqual({background: 'yellow'});
		});
	});
});
