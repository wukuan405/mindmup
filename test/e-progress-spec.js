/*global beforeEach, describe, expect, it, MAPJS, MM, jasmine, observable, jQuery, afterEach,  _, spyOn */
/*jshint laxbreak:true*/
describe('MM.ContentStatusUpdater', function () {
	'use strict';
	var underTest, content,
		mapControllerStub = function (content) {
			var mc  = {};
			mc.addEventListener = function (eventType, listener) {
				listener('', content);
			};
			return mc;
		};
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
					},
					'questionable': {
						style: {
							background: '#ff0000'
						},
						icon: {
							url: 'http://icon1'
						}
					},
					'doomed': {
						icon: {
							url: 'http://icon2'
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
				},
				2: {
					id: 2,
					ideas: {
						1: {
							id: 21,
							style: {
								background: '#888888'
							}
						},
						2: {
							id: 22,
							attr: { icon: { url: 'http://old' } }
						}
					}
				},
				3: {
					id: 3,
					ideas: {
						1: {
							id: 31,
							attr: {
								style: { background: '#ff0000' },
								icon: { url: 'http://old' },
								'test-status': 'in-progress' // -> doomed should clear the background because in progress defined it
													  // -> failure should not clear the icon because in progress did not define it
							}
						},
						2: {
							id: 32,
							attr: {
								style: { background: '#ff0000' },
								icon: { url: 'http://old' },
								'test-status': 'doomed' // -> in-progress should clear icon because doomed defines it
							}
						}
					}
				},

			}
		});
		underTest = new MM.ContentStatusUpdater('test-status', 'test-statuses', mapControllerStub(content));
	});
	it('propagation keeps child status - regression bug check', function () {
		underTest.updateStatus(1111, 'questionable');
		expect(content.getAttrById(1111, 'test-status')).toBe('questionable');
		expect(content.getAttrById(111, 'test-status')).toBe('questionable');
	});
	describe('updateStatus', function () {
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
		it('should update icon if only icon is given', function () {
			underTest.updateStatus(21, 'doomed');
			expect(content.getAttrById(21, 'icon')).toEqual({ url: 'http://icon2' });
			expect(content.getAttrById(21, 'style')).toEqual({background: '#888888'});
		});
		it('should update both icon and style if both are given', function () {
			underTest.updateStatus(21, 'questionable');
			expect(content.getAttrById(21, 'icon')).toEqual({ url: 'http://icon1' });
			expect(content.getAttrById(21, 'style')).toEqual({background: '#ff0000'});
		});
		it('should not touch icon if only style is given', function () {
			underTest.updateStatus(22, 'passing');
			expect(content.getAttrById(22, 'icon')).toEqual({ url: 'http://old' });
		});
		it('should clear background if defined by the previous status', function () {
			underTest.updateStatus(31, 'doomed');
			expect(content.getAttrById(31, 'style').background).toBeFalsy();
		});
		it('should not clear icon if not defined by the previous status', function () {
			underTest.updateStatus(31, 'failure');
			expect(content.getAttrById(31, 'icon')).toBeTruthy();
		});
		it('should clear icon if defined by the previous status', function () {
			underTest.updateStatus(32, 'in-progress');
			expect(content.getAttrById(32, 'icon')).toBeFalsy();
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
				attr: {
					'test-statuses': {
						'onlybg': {
							style: {
								background: '#ffffff'
							}
						},
						'both': {
							style: {
								background: '#ff0000'
							},
							icon: {
								url: 'http://icon1'
							}
						},
						'onlyicon': {
							icon: {
								url: 'http://icon2'
							}
						}
					},
					status: 'onlybg',
					style: { background: '#ffffff' },
					icon: {url: 'http://icon2'}
				},
				ideas: {
					1: {
						id: 11,
						attr: { status: 'both', style: { other: 'something', background: '#ff0000' }, icon: {url: 'http://icon1'} },
						ideas: {
							1: {
								id: 111,
								attr: { style: { background: 'yellow' } },
							},
							2: {
								id: 112,
								attr: { icon: { url: 'http://old' } },
							},
							3: {
								id: 113,
								attr: { status: 'onlyicon', style: { background: '#ff0000' }, icon: {url: 'http://icon2'} },
							}
						}
					}
				}
			});
			underTest = new MM.ContentStatusUpdater('status', 'test-statuses', mapControllerStub(content));
		});
		it('drops status attributes from cleared nodes', function () {
			underTest.clear();
			expect(content.getAttrById(1, 'status')).toBeFalsy();
			expect(content.getAttrById(11, 'status')).toBeFalsy();
			expect(content.getAttrById(113, 'status')).toBeFalsy();
		});
		it('drops icon attributes from cleared nodes only if status defined an icon', function () {
			underTest.clear();
			expect(content.getAttrById(1, 'icon')).toBeTruthy();
			expect(content.getAttrById(11, 'icon')).toBeFalsy();
			expect(content.getAttrById(113, 'icon')).toBeFalsy();
		});
		it('drops from cleared nodes any styling attributes defined by status', function () {
			underTest.clear();
			expect(content.getAttrById(1, 'style')).toBeFalsy();
			expect(content.getAttrById(11, 'style').background).toBeFalsy();
			expect(content.getAttrById(11, 'style').other).toEqual('something');
			expect(content.getAttrById(113, 'style').background).toBeTruthy();

		});
		it('clears the status for a single node if given a node id', function () {
		});
		/*
		it('deletes all status attributes and drops styling for any elements with status', function () {
			underTest.clear();
			expect(content.getAttr('status')).toBeFalsy();
			expect(content.getAttr('style')).toBeFalsy();
			expect(content.findSubIdeaById(11).getAttr('status')).toBeFalsy();
			expect(content.findSubIdeaById(11).getAttr('style')).toBeFalsy();
			expect(content.findSubIdeaById(11).getAttr('icon')).toBeFalsy();
		});
		it('does not drop styling of non-status elements', function () {
			underTest.clear();
			expect(content.findSubIdeaById(111).getAttr('style')).toEqual({background: 'yellow'});
			expect(content.findSubIdeaById(112).getAttr('icon')).toEqual({url: 'http://old'});
		});
		*/
		//TODO: improve by removing only backgrounds and icons that are actually included in the status (eg don't clear color if status did not define color
	});
	describe('setStatusConfig', function () {
		var content, underTest,
			configOne = { 'passing': { style: { background: '#ffffff' } } };
		beforeEach(function () {
			content = MAPJS.content({
				id: 1,
				attr: { 'test-statuses': 'old' }
			});
			underTest = new MM.ContentStatusUpdater('status', 'test-statuses', mapControllerStub(content));
		});
		it('changes status configuration on current content', function () {
			underTest.setStatusConfig(configOne);
			expect(content.getAttr('test-statuses')).toEqual(configOne);
		});
		it('changes status configuration on current content', function () {
			underTest.setStatusConfig(false);
			expect(content.getAttr('test-statuses')).toBeFalsy();
		});
		it('dispatches config changed event when configuration changes', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('configChanged', listener);
			underTest.setStatusConfig(configOne);
			expect(listener).toHaveBeenCalledWith(configOne);
		});
		it('ignores non numerical priority', function () {
			underTest.setStatusConfig({ 'passing': { priority: 'abc', style: { background: '#ffffff' } } });
			expect(content.getAttr('test-statuses')).toEqual(configOne);
		});
		it('parses numerical priorities if provided as strings', function () {
			underTest.setStatusConfig({ 'passing': { priority: '2', style: { background: '#ffffff' } } });
			expect(content.getAttr('test-statuses')).toEqual({ 'passing': { priority: '2', style: { background: '#ffffff' } } });
		});
	});
	describe('mapController bindings', function () {
		var mapController, underTest, configOne, configTwo, firstContent, secondContent;
		beforeEach(function () {
			mapController = observable({});
			underTest = new MM.ContentStatusUpdater('status', 'test-statuses', mapController);
			configOne = { 'passing': { style: { background: '#ffffff' } } };
			configTwo = { 'failing': { style: { background: '#ffffff' } } };
			firstContent = MAPJS.content({
				id: 1,
				attr: { 'test-statuses': configOne }
			});
			secondContent = MAPJS.content({
				id: 1,
				attr: { 'test-statuses': configTwo }
			});
		});
		it('fires configChanged when the content changes', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('configChanged', listener);
			mapController.dispatchEvent('mapLoaded', '', firstContent);
			expect(listener).toHaveBeenCalledWith(configOne);
		});
	});
});
describe('progressStatusUpdateWidget', function () {
	'use strict';
	var elementHTML = '<div>  ' +
		'	<ul data-mm-role="status-list">' +
		'			<li data-mm-progress-visible="inactive"><a data-mm-role="start" data-mm-progress-type="double"></a></li>' +
		'			<li data-mm-progress-visible="inactive"><a data-mm-role="start" data-mm-progress-type="single"></a></li>' +
		'			<li data-mm-role="status-template">' +
		'				<a data-mm-role="set-status">' +
		'					<div data-mm-role="status-color" class="progress-color">&nbsp;</div>&nbsp;' +
		'					<span data-mm-role="status-name"></span>' +
		'					<span data-mm-role="status-key"></span>' +
        '					<span data-mm-role="status-icon"><img class="progress-icon" data-mm-role="icon-image-placeholder"/></span>' +
		'					<span data-mm-role="status-priority"></span>' +
		'				</a>' +
		'			</li>' +
		'			<li class="divider" data-mm-progress-visible="active"></li>' +
		'			<li data-mm-progress-visible="active"><a data-mm-role="toggle-toolbar" ></a></li>' +
		'			<li data-mm-progress-visible="active"><a data-mm-role="clear" ></a></li>' +
		'			<li data-mm-progress-visible="active"><a data-mm-role="deactivate" ></a></li>' +
		'			<li data-mm-progress-visible="active"><a data-mm-role="save" ></a></li>' +
		'		</ul>' +
		'	</div>',
		mapModel,
		updater,
		domElement,
		expectVisibilitySettings = function (activeDisplay, inactiveDisplay) {
			var active = domElement.find('[data-mm-progress-visible=active]'),
				inactive = domElement.find('[data-mm-progress-visible=inactive]');
			active.each(function () {
				expect(jQuery(this).css('display')).toBe(activeDisplay);
			});
			inactive.each(function () {
				expect(jQuery(this).css('display')).toBe(inactiveDisplay);
			});
		},
		singleConfig = { passed: {style: {background: '#FF0000' }}},
		doubleConfig = { passed: {description: 'Passed desc', style: {background: 'rgb(0, 0, 255)'}},
						failed: {description: 'Failed desc', priority: 1, icon: {url: 'http://failedurl' }, style: {background: 'rgb(255, 0, 0)'}}};

	beforeEach(function () {
		mapModel = observable({});
		updater = observable({});
		domElement = jQuery(elementHTML).appendTo('body').progressStatusUpdateWidget(updater, mapModel, {
			single: singleConfig,
			double: doubleConfig
		});
	});
	afterEach(function () {
		domElement.detach();
	});
	describe('menu visibility', function () {
		it('removes items with visible=active when by default', function () {
			expectVisibilitySettings('none', 'list-item');
		});
		it('shows active and removes inactive when there is an active configuration', function () {
			updater.dispatchEvent('configChanged', singleConfig);
			expectVisibilitySettings('list-item', 'none');
		});
		it('hides active and shows inactive when there is no active configuration', function () {
			updater.dispatchEvent('configChanged', singleConfig);
			updater.dispatchEvent('configChanged', false);
			expectVisibilitySettings('none', 'list-item');
		});
		it('clones the template for each status in the config when config changes, setting the fields from the config', function () {
			updater.dispatchEvent('configChanged', doubleConfig);
			var statuses = domElement.find('[data-mm-role=progress]');
			expect(statuses.size()).toBe(2);
			expect(statuses.first().find('[data-mm-role=status-name]').text()).toBe('Failed desc');
			expect(statuses.first().attr('data-mm-progress-key')).toBe('failed');
			expect(statuses.first().find('[data-mm-role=status-priority]').text()).toBe('1');
			expect(statuses.first().find('[data-mm-role=status-color]').css('background-color')).toBe('rgb(255, 0, 0)');
			expect(statuses.first().find('[data-mm-role=status-icon]').data('icon')).toEqual({url: 'http://failedurl'});
			expect(statuses.last().find('[data-mm-role=status-icon]').data('icon')).toBeFalsy();
			expect(statuses.last().find('[data-mm-role=status-name]').text()).toBe('Passed desc');
			expect(statuses.last().find('[data-mm-role=status-color]').css('background-color')).toBe('rgb(0, 0, 255)');
			expect(statuses.last().attr('data-mm-progress-key')).toBe('passed');
			expect(statuses.last().find('[data-mm-role=status-priority]').text()).toBe('');
		});
		it('hides the icon image placeholder if icon is not provided in the status', function () {
			updater.dispatchEvent('configChanged', doubleConfig);
			var statuses = domElement.find('[data-mm-role=progress]');
			expect(statuses.last().find('[data-mm-role=icon-image-placeholder]').css('display')).toBe('none');
		});
		it('shows the icon image placeholder and sets src to appropriate url if icon is provided in the status', function () {
			updater.dispatchEvent('configChanged', doubleConfig);
			var statuses = domElement.find('[data-mm-role=progress]');
			expect(statuses.first().find('[data-mm-role=icon-image-placeholder]').attr('src')).toEqual('http://failedurl');
			expect(statuses.first().find('[data-mm-role=icon-image-placeholder]').css('display')).toBe('inline');
		});
		it('orders by priority, highest priority first, then items without priority in alphabetic order', function () {
			var numericOrderConfig = {
				'kalpha': {description: 'F', style: {background: 'rgb(255, 0, 0)'}},
				'k777': {description: 'F', priority: 777, style: {background: 'rgb(255, 0, 0)'}},
				'k999': {description: 'F', priority: 999, style: {background: 'rgb(255, 0, 0)'}},
				'k888': {description: 'F', priority: 888, style: {background: 'rgb(255, 0, 0)'}},
			},
				statuses;
			updater.dispatchEvent('configChanged', numericOrderConfig);
			statuses = domElement.find('[data-mm-role=progress]');
			expect(statuses.size()).toBe(4);
			expect(statuses.eq(0).attr('data-mm-progress-key')).toBe('k999');
			expect(statuses.eq(1).attr('data-mm-progress-key')).toBe('k888');
			expect(statuses.eq(2).attr('data-mm-progress-key')).toBe('k777');
			expect(statuses.eq(3).attr('data-mm-progress-key')).toBe('kalpha');
		});
		it('supports inputs for color, setting the value', function () {
			updater.dispatchEvent('configChanged', singleConfig);
			expect(domElement.find('[data-mm-role=status-color]').val()).toBe('#FF0000');
		});

	});
	describe('action binding', function () {
		beforeEach(function () {
			updater.dispatchEvent('configChanged', singleConfig);
		});
		it('drops config when clicked on deactivate', function () {
			updater.setStatusConfig = jasmine.createSpy();
			domElement.find('[data-mm-role=deactivate]').click();
			expect(updater.setStatusConfig).toHaveBeenCalledWith(false);
		});
		it('sets configuration to the one specified with data-mm-progress-type when clicked on start', function () {
			updater.setStatusConfig = jasmine.createSpy();
			domElement.find('[data-mm-progress-type=double]').click();
			expect(updater.setStatusConfig).toHaveBeenCalledWith(doubleConfig);
		});
		it('clears statuses clicked on clear', function () {
			updater.clear = jasmine.createSpy();
			domElement.find('[data-mm-role=clear]').click();
			expect(updater.clear).toHaveBeenCalled();
		});
		it('puts body class progress-toolbar-active when clicked on toggle-toolbar if class does not exist', function () {
			jQuery('body').removeClass('progress-toolbar-active');
			domElement.find('[data-mm-role=toggle-toolbar]').click();
			expect(jQuery('body').hasClass('progress-toolbar-active')).toBeTruthy();
		});
		it('removes body class progress-toolbar-active when clicked on toggle-toolbar if class exists', function () {
			jQuery('body').addClass('progress-toolbar-active');
			domElement.find('[data-mm-role=toggle-toolbar]').click();
			expect(jQuery('body').hasClass('progress-toolbar-active')).toBeFalsy();
		});
		it('updates currently activated nodes when clicked on a progress status link', function () {
			updater.updateStatus = jasmine.createSpy();
			mapModel.applyToActivated = function (func) {
				func(17);
			};
			domElement.find('[data-mm-role=progress] [data-mm-role=set-status]').click();
			expect(updater.updateStatus).toHaveBeenCalledWith(17, 'passed');
		});
		it('serialises current list of statuses to updater when clicked on save link', function () {
			var newStatusHtml = '<li data-mm-role="progress" data-mm-progress-key="Key 1">'
				+ '<input data-mm-role="status-color" value="#0FF0FF"/>'
				+ '<span data-mm-role="status-name">Name 1</span>'
				+ '<span data-mm-role="status-priority">1</span>'
				+ '</li>'
				+ '<li data-mm-role="progress" data-mm-progress-key="Key 2">'
				+ '<input data-mm-role="status-color" value="#FFFFFF"/>'
				+ '<span data-mm-role="status-name">No Priority</span>'
				+ '<span data-mm-role="status-priority"></span>'
				+ '<span id="secondIcon" data-mm-role="status-icon"></span>'
				+ '</li>';
			domElement.find('[data-mm-role=progress]').remove();
			domElement.find('[data-mm-role=status-list]').append(jQuery(newStatusHtml));
			domElement.find('#secondIcon').data('icon', {url: 'xxx'});
			updater.setStatusConfig = jasmine.createSpy();
			domElement.find('[data-mm-role=save]').click();
			expect(updater.setStatusConfig).toHaveBeenCalledWith({
				'Key 1': {
					description: 'Name 1',
					style: { background: '#0FF0FF'},
					priority: '1'
				},
				'Key 2': {
					description: 'No Priority',
					style: { background: '#FFFFFF' },
					icon: {url: 'xxx'}
				}
			});
		});
		it('ignores transparent color when reading background', function () {
			var newStatusHtml = '<li data-mm-role="progress" data-mm-progress-key="Key 1">'
				+ '<input data-mm-role="status-color" value="transparent"/>'
				+ '<span data-mm-role="status-name">Name 1</span>'
				+ '<span data-mm-role="status-priority">1</span>'
				+ '<span id="firstIcon" data-mm-role="status-icon"></span>'
				+ '</li>';
			domElement.find('[data-mm-role=progress]').remove();
			domElement.find('[data-mm-role=status-list]').append(jQuery(newStatusHtml));
			domElement.find('#firstIcon').data('icon', {url: 'xxx'});
			updater.setStatusConfig = jasmine.createSpy();
			domElement.find('[data-mm-role=save]').click();
			expect(updater.setStatusConfig).toHaveBeenCalledWith({
				'Key 1': {
					description: 'Name 1',
					priority: '1',
					icon: {url: 'xxx'}
				}
			});
		});
		it('ignores false as string color when reading background', function () {
			var newStatusHtml = '<li data-mm-role="progress" data-mm-progress-key="Key 1">'
				+ '<input data-mm-role="status-color" value="false"/>'
				+ '<span data-mm-role="status-name">Name 1</span>'
				+ '<span data-mm-role="status-priority">1</span>'
				+ '<span id="firstIcon" data-mm-role="status-icon"></span>'
				+ '</li>';
			domElement.find('[data-mm-role=progress]').remove();
			domElement.find('[data-mm-role=status-list]').append(jQuery(newStatusHtml));
			domElement.find('#firstIcon').data('icon', {url: 'xxx'});
			updater.setStatusConfig = jasmine.createSpy();
			domElement.find('[data-mm-role=save]').click();
			expect(updater.setStatusConfig).toHaveBeenCalledWith({
				'Key 1': {
					description: 'Name 1',
					priority: '1',
					icon: {url: 'xxx'}
				}
			});
		});
		it('autogenerates keys for statuses without a key, numerically skipping any existing values', function () {
			var newStatusHtml = '<li data-mm-role="progress" >'
				+ '<input data-mm-role="status-color" value="#0FF0FF"/>'
				+ '<span data-mm-role="status-name">Name 1</span>'
				+ '<span data-mm-role="status-priority">1</span>'
				+ '</li>'
				+ '<li data-mm-role="progress" data-mm-progress-key="6">'
				+ '<input data-mm-role="status-color" value="#FFFFFF"/>'
				+ '<span data-mm-role="status-name">No Priority</span>'
				+ '<span data-mm-role="status-priority"></span>'
				+ '</li>';
			domElement.find('[data-mm-role=progress]').remove();
			domElement.find('[data-mm-role=status-list]').append(jQuery(newStatusHtml));
			updater.setStatusConfig = jasmine.createSpy();
			domElement.find('[data-mm-role=save]').click();
			expect(updater.setStatusConfig).toHaveBeenCalledWith({
				'7': {
					description: 'Name 1',
					style: { background: '#0FF0FF'},
					priority: '1'
				},
				'6': {
					description: 'No Priority',
					style: { background: '#FFFFFF' }
				}
			});
		});
		it('autogenerates keys starting from 1 when no keys are defined', function () {
			var newStatusHtml = '<li data-mm-role="progress" >'
				+ '<input data-mm-role="status-color" value="#0FF0FF"/>'
				+ '<span data-mm-role="status-name">Name 1</span>'
				+ '<span data-mm-role="status-priority">1</span>'
				+ '</li>'
				+ '<li data-mm-role="progress">'
				+ '<input data-mm-role="status-color" value="#FFFFFF"/>'
				+ '<span data-mm-role="status-name">No Priority</span>'
				+ '<span data-mm-role="status-priority"></span>'
				+ '</li>';
			domElement.find('[data-mm-role=progress]').remove();
			domElement.find('[data-mm-role=status-list]').append(jQuery(newStatusHtml));
			updater.setStatusConfig = jasmine.createSpy();
			domElement.find('[data-mm-role=save]').click();
			expect(updater.setStatusConfig).toHaveBeenCalledWith({
				'1': {
					description: 'Name 1',
					style: { background: '#0FF0FF'},
					priority: '1'
				},
				'2': {
					description: 'No Priority',
					style: { background: '#FFFFFF' }
				}
			});
		});
	});
});
describe('Calc Model', function () {
	'use strict';
	var underTest,
		mapController,
		activeContent,
		contentWithStatuses = MAPJS.content({
			id: 1,
			attr: {
				status: 'done',
				'test-statuses': {
					done: { description: 'Done!!'},
					shonky: { description: 'Shonky!'}
				}
			},
			ideas: {
				1: {
					id: 11,
					attr: { status: 'done' },
					ideas: {
						1: {
							id: 111,
						},
						3: {
							id: 112,
							attr: { status: 'shonky'},
						}
					}
				}
			}
		});
	beforeEach(function () {
		mapController = observable({});
		activeContent = MAPJS.content({});
		underTest = new MM.CalcModel('status', 'test-statuses', mapController);
		mapController.dispatchEvent('mapLoaded', 'testID', activeContent);
	});
	describe('publishing update events when content changes', function () {
		describe('when has no listeners', function () {
			it('does not traverse the tree if a node changes', function () {
				spyOn(activeContent, 'traverse').andCallThrough();
				activeContent.updateAttr(1, 'status', 'yellow');
				expect(activeContent.traverse).not.toHaveBeenCalled();
			});
			it('does not traverse the tree when a new map is loaded', function () {
				spyOn(contentWithStatuses, 'traverse').andCallThrough();
				mapController.dispatchEvent('mapLoaded', 'testID2', contentWithStatuses);
				expect(contentWithStatuses.traverse).not.toHaveBeenCalled();

			});
		});
		describe('when it gets a listener', function () {
			var listenerOne, listenerTwo;
			beforeEach(function () {
				listenerOne = jasmine.createSpy('one');
				listenerTwo = jasmine.createSpy('one');
				underTest.addEventListener('dataUpdated', listenerOne);
				listenerOne.reset();

				underTest.addEventListener('dataUpdated', listenerTwo);
			});
			it('publishes a dataUpdated event immediately to that listener', function () {
				expect(listenerTwo).toHaveBeenCalledWith([]);
			});
			it('does not publish a dataUpdated event to any other listners', function () {
				expect(listenerOne).not.toHaveBeenCalled();
			});
		});
		describe('when first listener is added', function () {
			var listenerOne;
			it('recalculates the table', function () {
				mapController.dispatchEvent('mapLoaded', 'testID2', contentWithStatuses);
				listenerOne = jasmine.createSpy('one');
				underTest.addEventListener('dataUpdated', listenerOne);
				expect(listenerOne).toHaveBeenCalledWith([
					['Done!!', 2],
					['Shonky!', 1]
				]);
			});
		});
		describe('when it has listeners', function () {
			var listenerOne;
			beforeEach(function () {
				listenerOne = jasmine.createSpy('one');
				underTest.addEventListener('dataUpdated', listenerOne);
				listenerOne.reset();
			});
			it('publishes a dataUpdated event if the progress status of any node changes', function () {
				activeContent.updateAttr(1, 'status', 'yellow');
				expect(listenerOne).toHaveBeenCalledWith([
					['yellow', 1]
				]);
			});
			it('publishes a dataUpdated event when a new map is loaded', function () {
				mapController.dispatchEvent('mapLoaded', 'testID2', contentWithStatuses);
				expect(listenerOne).toHaveBeenCalledWith([
					['Done!!', 2],
					['Shonky!', 1]
				]);
			});
			it('does not publish an event after a new map is loaded when the old content changes', function () {
				mapController.dispatchEvent('mapLoaded', 'testID2', contentWithStatuses);
				listenerOne.reset();
				activeContent.updateAttr(1, 'status', 'yellow');
				expect(listenerOne).not.toHaveBeenCalled();
			});

		});

	});
});
describe('Calc widget', function () {
	'use strict';

	var template =	'<div id="calcWidget1" class="modal" >' +
					'<button data-mm-role="hide-calc-widget" data-mm-calc-id="calcWidget1"></button>' +
					'<table data-mm-role="calc-table"></table>' +
					'<div data-mm-role="empty">BLA!</div>' +
					'</div>',
		openButtonTemplate = '<button data-mm-role="show-calc-widget" data-mm-calc-id="calcWidget1"></button>',
		underTest,
		showButton,
		hideButton,
		activityLog,
		calcModel,
		tableDOM,
		msgDiv,
		simpleTable = [
			['first', 2],
			['second', 4]
		],
		checkContents = function (dataTable) {
			expect(tableDOM.find('tr').length).toBe(dataTable.length);
			_.each(dataTable, function (row, rowindex) {
				expect(tableDOM.find('tr:eq(' + rowindex + ') td').length).toBe(row.length);
				_.each(row, function (cell, cellindex) {
					expect(tableDOM.find('tr:eq(' + rowindex + ') td:eq(' + cellindex + ')').text()).toEqual(cell.toString());
				});
			});
		};
	beforeEach(function () {
		activityLog = { log: jasmine.createSpy('log') };
		calcModel = observable({});
		showButton = jQuery(openButtonTemplate).appendTo('body');
		underTest = jQuery(template).appendTo('body').calcWidget(calcModel, activityLog);
		hideButton = jQuery('[data-mm-role=hide-calc-widget][data-mm-calc-id=calcWidget1]');
		tableDOM = underTest.find('[data-mm-role=calc-table]');
		msgDiv = underTest.find('[data-mm-role=empty]');
	});
	afterEach(function () {
		jQuery('#calcWidget1').detach();
		jQuery('[data-mm-role=show-calc-widget]').detach();
	});
	describe('shows the progress status counts when it becomes visible', function () {
		it('creates data rows for each table row inside data-mm-role=counts-table', function () {
			showButton.click();
			calcModel.dispatchEvent('dataUpdated', simpleTable);
			checkContents(simpleTable);
		});
		it('removes any previous content from data-mm-role=counts-table', function () {
			tableDOM.html('<tr><td>hey</td><td>there</td></tr>');
			showButton.click();
			calcModel.dispatchEvent('dataUpdated', simpleTable);
			checkContents(simpleTable);
		});
	});
	describe('graceful handling of no data in the report', function () {
		beforeEach(function () {
			showButton.click();
			underTest.show();
			tableDOM.show();
		});
		it('hides the table and shows the data-mm-role=empty div when the data is empty', function () {
			calcModel.dispatchEvent('dataUpdated', []);
			expect(tableDOM.css('display')).toBe('none');
			expect(msgDiv.css('display')).not.toBe('none');
		});
		it('hides data-mm-role=empty div and shows the table when the data is not empty', function () {
			calcModel.dispatchEvent('dataUpdated', simpleTable);
			expect(tableDOM.css('display')).not.toBe('none');
			expect(msgDiv.css('display')).toBe('none');
		});
	});
	it('updates automatically when the model fires an update', function () {
		showButton.click();
		calcModel.dispatchEvent('dataUpdated', [[1, 2]]);
		calcModel.dispatchEvent('dataUpdated', simpleTable);
		checkContents(simpleTable);
	});
	it('removes itself as a listener from the model when it is hidden', function () {
		showButton.click();
		calcModel.dispatchEvent('dataUpdated', simpleTable);
		spyOn(calcModel, 'removeEventListener').andCallThrough();
		hideButton.click();
		calcModel.dispatchEvent('dataUpdated', [[1, 2]]);

		expect(calcModel.removeEventListener).toHaveBeenCalled();
		checkContents(simpleTable);
	});

});
