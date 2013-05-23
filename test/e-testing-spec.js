/*global beforeEach, describe, expect, it, MAPJS, MM*/
describe('ContentStatusUpdater', function () {
	'use strict';
	var underTest, content;
	beforeEach(function () {
		content = MAPJS.content({
			attr: {
				'test-statuses': {
					'newStatus': {
						style: {
							background: '#ffffff'
						}
					},
					'failure': {
						forceParent: true,
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
							id: 111
						},
						2: {
							id: 112
						}
					}
				},
				2: {
					id: 12,
					ideas: {
						1: {
							id: 121,
							ideas: {
								1: {
									id: 1211
								}
							}
						}
					}

				}
			}
		});
		underTest = new MM.ContentStatusUpdater('test-status', 'test-statuses', content);
	});
	describe('updates the node style:', function () {
		it('should change the node to be the color associated with the status', function () {
			underTest.updateStatus(1, 'newStatus');

			expect(content.attr.style.background).toBe('#ffffff');
		});
		it('should preserve the existing styles where they are not overridden', function () {
			underTest.updateStatus(1, 'newStatus');
			expect(content.attr.style.otherStyle).toBe('foo');
		});
		it('should return true if successful', function () {
			expect(underTest.updateStatus(1, 'newStatus')).toBeTruthy();
		});
		it('should leave the node style unchanged if the style is not recognised', function () {
			expect(underTest.updateStatus(1, 'dodgyStatus')).toBeFalsy();
			expect(content.attr.style).toEqual({
				background: '#000000',
				otherStyle: 'foo'
			});
		});
		it('should return false if idea with id not found', function () {
			expect(underTest.updateStatus(31412, 'newStatus')).toBeFalsy();
		});
		it('should change the style of child ideas', function () {
			underTest.updateStatus(12, 'newStatus');
			expect(content.getAttrById(12, 'style')).toEqual({background: '#ffffff'});
		});
	});
	describe('persists the status', function () {
		it('sets the status attribute', function () {
			underTest.updateStatus(1, 'newStatus');
			expect(content.getAttrById(1, 'test-status')).toEqual('newStatus');
		});
	});
	describe('propagates status changes to parents', function () {
		it('should set the status of the parent if all children have the same status', function () {
			underTest.updateStatus(1211, 'newStatus');
			expect(content.getAttrById(121, 'test-status')).toEqual('newStatus');
			expect(content.getAttrById(12, 'test-status')).toEqual('newStatus');
		});
		it('should only change parent if all children have the same status if status has forceParent attribute', function () {
			underTest.updateStatus(111, 'newStatus');
			expect(content.getAttrById(11, 'test-status')).not.toEqual('newStatus');
		});
		// it('should change parent if other children have no status and the status does not have forceParent attribute', function () {
		// 	underTest.updateStatus(111, 'newStatus');
		// 	expect(content.getAttrById(11, 'test-status')).not.toEqual('newStatus');
		// });
	});
});
