/*global beforeEach, describe, expect, it, MAPJS, MM, jasmine, observable, jQuery, afterEach,  _, spyOn*/
/*jshint laxbreak:true*/
describe('MM.ContentStatusUpdater', function () {
	'use strict';
	var underTest, content, activeContentListener,
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
				}
			}
		});
		activeContentListener = new MM.ActiveContentListener(mapControllerStub(content));
		underTest = new MM.ContentStatusUpdater('test-status', 'test-statuses', 'test-measurement-value', 'test-measurement-config',  activeContentListener);
	});
	it('propagation keeps child status - regression bug check', function () {
		underTest.updateStatus(1111, 'questionable');
		expect(content.getAttrById(1111, 'test-status')).toBe('questionable');
		expect(content.getAttrById(111, 'test-status')).toBe('questionable');
	});
	describe('setMeasurements', function () {
		it('sets measurements', function () {
			underTest.setMeasurements(['one', 'two']);
			expect(content.getAttrById(1, 'test-measurement-config')).toEqual(['one', 'two']);
		});
		it('sets empty list of measurements', function () {
			underTest.setMeasurements([]);
			expect(content.getAttrById(1, 'test-measurement-config')).toBeFalsy();
		});
	});
	describe('measurement changed event', function () {
		var listener;
		beforeEach(function () {
			listener = jasmine.createSpy('listener');
			underTest.addEventListener('measurementsChanged', listener);
		});
		it('should publish a measurementsChanged event when the attribute changes', function () {
			content.updateAttr(1,  'test-measurement-config', ['three', 'four']);
			expect(listener).toHaveBeenCalledWith(['three', 'four']);
		});
		it('should publish a measurementsChanged event when the updater is refreshed', function () {
			content.updateAttr(1,  'test-measurement-config', ['three', 'four']);
			listener.calls.reset();
			underTest.refresh();
			expect(listener).toHaveBeenCalledWith(['three', 'four']);
		});
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
				['failure',		'in-progress',	'failure',			'higher priority wins even if on sibling']
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
								attr: { style: { background: 'yellow' } }
							},
							2: {
								id: 112,
								attr: { icon: { url: 'http://old' } }
							},
							3: {
								id: 113,
								attr: { status: 'onlyicon', style: { background: '#ff0000' }, icon: {url: 'http://icon2'} }
							}
						}
					}
				}
			});
			activeContentListener = new MM.ActiveContentListener(mapControllerStub(content));
			underTest = new MM.ContentStatusUpdater('status', 'test-statuses',  'test-measurement-value', 'test-measurement-config', activeContentListener);
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
	});
	describe('setStatusConfig', function () {
		var content, underTest,
			configOne = { 'passing': { style: { background: '#ffffff' } } };
		beforeEach(function () {
			content = MAPJS.content({
				id: 1,
				attr: { 'test-statuses': 'old' }
			});
			activeContentListener = new MM.ActiveContentListener(mapControllerStub(content));
			underTest = new MM.ContentStatusUpdater('status', 'test-statuses', 'test-measurement-value', 'test-measurement-config', activeContentListener);
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
			underTest = new MM.ContentStatusUpdater('status', 'test-statuses', 'test-measurement-value', 'test-measurement-config', new MM.ActiveContentListener(mapController));
			configOne = { 'passing': { style: { background: '#ffffff' } } };
			configTwo = { 'failing': { style: { background: '#ffffff' } } };
			firstContent = MAPJS.content({
				id: 1,
				attr: { 'test-statuses': configOne, 'test-measurement-config': ['one', 'two'] }
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
		it('fires measurementsChanged when the content changes', function () {
			var listener = jasmine.createSpy();
			underTest.addEventListener('measurementsChanged', listener);
			mapController.dispatchEvent('mapLoaded', '', firstContent);
			expect(listener).toHaveBeenCalledWith(['one', 'two']);
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
		'			<input data-mm-role="measurements" value="Cost,Effort" />' +
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
		updater = observable({
			setMeasurements: jasmine.createSpy('setMeasurements'),
			setStatusConfig: jasmine.createSpy(),
			updateStatus: jasmine.createSpy()
		});
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
				'kalpha': {description: 'FA', style: {background: 'rgb(255, 0, 0)'}},
				'kbeta': {description: 'FB', style: {background: 'rgb(255, 0, 0)'}},
				'k777': {description: 'F', priority: 777, style: {background: 'rgb(255, 0, 0)'}},
				'k999': {description: 'F', priority: 999, style: {background: 'rgb(255, 0, 0)'}},
				'k888': {description: 'F', priority: 888, style: {background: 'rgb(255, 0, 0)'}}
			},
				statuses;
			updater.dispatchEvent('configChanged', numericOrderConfig);
			statuses = domElement.find('[data-mm-role=progress]');
			expect(statuses.size()).toBe(5);
			expect(statuses.eq(0).attr('data-mm-progress-key')).toBe('k999');
			expect(statuses.eq(1).attr('data-mm-progress-key')).toBe('k888');
			expect(statuses.eq(2).attr('data-mm-progress-key')).toBe('k777');
			expect(statuses.eq(3).attr('data-mm-progress-key')).toBe('kalpha');
			expect(statuses.eq(4).attr('data-mm-progress-key')).toBe('kbeta');
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
			domElement.find('[data-mm-role=deactivate]').click();
			expect(updater.setStatusConfig).toHaveBeenCalledWith(false);
		});
		it('sets configuration to the one specified with data-mm-progress-type when clicked on start', function () {
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

describe('MM.Progress.Calc', function () {
	'use strict';
	var data, config, underTest, mapModel, activeContent, measurementConfig;
	beforeEach(function () {
		data = [
			{ status: 'k999', title: 'Parent', id: 1 },
			{ status: 'k888', title: 'first2', id: 2, measurements: {'one': '20'}},
			{ status: 'k777', title: 'first3', id: 115, measurements: {'two': -300}},
			{ status: 'kalpha2', title: 'first4', id: 4, measurements: {'one': '50', 'two': 100}},
			{ status: 'k777', title: 'first5', id: 5, measurements: {'two': 300}},
			{ status: 'kalpha', title: 'first6', id: 6}
		];
		measurementConfig = ['one', 'two'];
		config = {
			'kalpha2': {description: 'F2', style: {background: 'rgb(255, 0, 0)'}},
			'kalpha3': {description: 'F3', style: {background: 'rgb(255, 0, 0)'}},
			'kalpha': {description: 'F1', style: {background: 'rgb(255, 0, 0)'}},
			'k777': {description: 'X777', priority: 777, style: {background: 'rgb(255, 0, 0)'}},
			'k666': {description: 'X666', priority: 666, style: {background: 'rgb(255, 0, 0)'}},
			'k999': {description: 'Y999', priority: 999, style: {background: 'rgb(255, 0, 0)'}},
			'k888': {description: 'Z888', priority: 888, style: {background: 'rgb(255, 0, 0)'}}
		};
		activeContent = MAPJS.content({
			id: 1,
			title: 'one',
			attr: {
				status: 'k888',
				'test-statuses': config,
				'test-measurement-config': measurementConfig
			},
			ideas: {
				1: {
					id: 11,
					title: 'eleven',
					attr: { status: 'k999' },
					ideas: {
						1: {
							id: 111,
							title: 'one hundred and eleven',
							attr: {
								status: 'kalpha2',
								'test-measurement': {
									one: 100
								}
							}
						},
						2: {
							id: 112,
							title: 'one hundred and twelve',
							attr: {
								status: 'kalpha',
								'test-measurement': {
									two: 200
								}
							}
						},
						3: {
							id: 113,
							title: 'one hundred and thirteen',
							attr: {
								status: 'k777',
								'test-measurement': {
									one: 10,
									two: 20
								}
							}
						},
						4: {
							id: 114,
							title: 'one hundred and fourteen',
							attr: { status: 'k777'}
						},
						5: {
							id: 115
						},
						6: {
							id: 116,
							attr: { status: 'unknown'}
						}

					}
				}
			}
		});
		mapModel = observable({});
		underTest = new MM.Progress.Calc('status', 'test-statuses', 'test-measurement', 'test-measurement-config', mapModel);
	});
	describe('projections', function () {
		var projections;
		beforeEach(function () {
			projections = underTest.getProjectionsFor(activeContent);
			projections.counts = projections[0].iterator;
			projections.percent = projections[1].iterator;
		});
		it('includes projections for measurements in supplied order', function () {
			var names = _.map(projections, function (projection) {
				return projection.name;
			});
			expect(names).toEqual(['Counts', 'Percentages', 'Total one', 'Percentage one',  'Total two', 'Percentage two']);
		});
		describe('measurement projections', function () {
			var projectionTotalOne, projectionTotalTwo;
			beforeEach(function () {
				spyOn(activeContent, 'mergeAttrProperty').and.callThrough();
				projectionTotalOne = projections[2].iterator(data);
				projectionTotalTwo = projections[4].iterator(data);
			});
			it('should return totalized projection of measurement', function () {
				var expected = [
					['Z888', 20],
					['F2', 50]
				];
				expect(projectionTotalOne.slice(0)).toEqual(expected);
			});
			it('should return totalized projection of measurement where more than one item sums to 0', function () {
				var expected = [
					['X777', 0],
					['F2', 100]
				];
				expect(projectionTotalTwo.slice(0)).toEqual(expected);
			});
		});
		describe('counts', function () {
			it('aggregates by status, replacing the status with description, and orders statuses by priority descending then alphanumeric when publishing', function () {
				var result = projections.counts(data);
				expect(result.slice(0)).toEqual([
					['Y999', 1],
					['Z888', 1],
					['X777', 2],
					['F1', 1],
					['F2', 1]
				]);
				expect(result.total()).toEqual(6);
			});
		});
		describe('percent', function () {
			it('converts a single data item to be 100%', function () {
				expect(projections.percent([
						{status: 'k777'}
					])).toEqual([['X777', '100%']]);
			});
			it('converts multiple values to be percentages, rounding to 2 decimals', function () {
				var result = projections.percent(data);
				expect(result).toEqual([
					['Y999', '17%'],
					['Z888', '17%'],
					['X777', '33%'],
					['F1', '17%'],
					['F2', '17%']
				]);
				expect(result.total).toBeFalsy();
			});
			it('handles no data', function () {
				expect(projections.percent([])).toEqual([]);
			});
		});
	});
	describe('dataAdapter', function () {
		it('denormalises map structure into a flat list of values, removing non-status or unrecognised status items', function () {
			var result = underTest.dataAdapter(activeContent);
			expect(result).toEqual([
				{ status: 'k888', id: 1, title: 'one'},
				{ status: 'k999', id: 11, title: 'eleven'},
				{ status: 'kalpha2', id: 111, title: 'one hundred and eleven', measurements: {'one': 100}},
				{ status: 'kalpha', id: 112, title: 'one hundred and twelve', measurements: {'two': 200}},
				{ status: 'k777', id: 113, title: 'one hundred and thirteen', measurements: {'one': 10, 'two': 20}},
				{ status: 'k777', id: 114, title: 'one hundred and fourteen'}
			]);
		});

		it('should apply filter by status names', function () {
			var result = underTest.dataAdapter(activeContent, {statuses: ['k777',  'kalpha2']});
			expect(result).toEqual([
				{ status: 'kalpha2', id: 111, title: 'one hundred and eleven', measurements: {'one': 100}},
				{ status: 'k777', id: 113, title: 'one hundred and thirteen', measurements: {'one': 10, 'two': 20}},
				{ status: 'k777', id: 114, title: 'one hundred and fourteen'}
			]);

		});
		describe('filtering by selected node', function () {
			beforeEach(function () {
				mapModel.getCurrentlySelectedIdeaId = jasmine.createSpy().and.returnValue(11);
			});
			it('includes only the selected subtree when selectedSubtree is set', function () {
				expect(underTest.dataAdapter(activeContent, {selectedSubtree: true})).toEqual([
					{ status: 'k999', id: 11, title: 'eleven'},
					{ status: 'kalpha2', id: 111, title: 'one hundred and eleven', measurements: {'one': 100}},
					{ status: 'kalpha', id: 112, title: 'one hundred and twelve', measurements: {'two': 200}},
					{ status: 'k777', id: 113, title: 'one hundred and thirteen', measurements: {'one': 10, 'two': 20}},
					{ status: 'k777', id: 114, title: 'one hundred and fourteen'}
				]);
			});
			it('includes the entire tree when selectedSubtree is not set', function () {
				expect(underTest.dataAdapter(activeContent, {})).toEqual([
					{ status: 'k888', id: 1, title: 'one'},
					{ status: 'k999', id: 11, title: 'eleven'},
					{ status: 'kalpha2', id: 111, title: 'one hundred and eleven', measurements: {'one': 100}},
					{ status: 'kalpha', id: 112, title: 'one hundred and twelve', measurements: {'two': 200}},
					{ status: 'k777', id: 113, title: 'one hundred and thirteen', measurements: {'one': 10, 'two': 20}},
					{ status: 'k777', id: 114, title: 'one hundred and fourteen'}
				]);
			});
		});
		describe('filtering hierarchy', function () {
			beforeEach(function () {
				activeContent = MAPJS.content({
					id: 1,
					attr: { status: 'k888', 'test-statuses': config },
					ideas: {
						2: {id: 2},
						3: {id: 3}
					}
				});
			});
			describe('when a child has no status', function () {
				it('includes parents even when includeParents filter is not set', function () {
					expect(underTest.dataAdapter(activeContent, {})).toEqual([{status: 'k888', id: 1}]);
				});
			});
			describe('when a child has same status as parent', function () {
				beforeEach(function () {
					activeContent.updateAttr(2, 'status', 'k888');
				});
				it('ignores parents when includeParents filter is not set', function () {
					expect(underTest.dataAdapter(activeContent, {})).toEqual([{status: 'k888', id: 2}]);
				});
				it('includes parents when includeParents filter is set', function () {
					expect(underTest.dataAdapter(activeContent, {includeParents: true})).toEqual([{status: 'k888', id: 1}, {status: 'k888', id: 2}]);
				});
			});
			describe('when a child has a different status', function () {
				it('includes parents even when includeParents filter is not set', function () {
					activeContent.updateAttr(2, 'status', 'k999');
					expect(underTest.dataAdapter(activeContent, {})).toEqual([{status: 'k888', id: 1}, {status: 'k999', id: 2}]);

				});
			});
		});
	});
});
describe('progressFilterWidget', function () {
	'use strict';
	var template =	'<div id="progressFilterWidget">' +
					'<button data-mm-role="toggle-widget"></button>' +
					'<div data-mm-role="filter">' +
						'<input type="checkbox" data-mm-role="toggle-property" value="firstProp" />' +
						'<input type="checkbox" data-mm-role="toggle-property" value="secondProp" />' +
						'<button data-mm-role="select-all-statuses"></button>' +
						'<table data-mm-role="status-list">' +
							'<tr data-mm-role="template"><td><input type="checkbox" data-mm-role="status-checkbox"/></td><td data-mm-role="status-description"></td></tr>' +
						'</table>' +
					'</div>' +
					'</div>',
		toggleButton,
		underTest,
		activityLog,
		calcModel,
		filterDom,
		configStatusUpdater;
	beforeEach(function () {
		activityLog = {};
		calcModel = observable({setFilter: jasmine.createSpy()});
		configStatusUpdater = observable({});
		var widgetDom = jQuery(template).appendTo('body');
		underTest = widgetDom.progressFilterWidget(calcModel, configStatusUpdater, activityLog);
		filterDom = widgetDom.find('[data-mm-role=filter]');
		toggleButton = widgetDom.find('[data-mm-role=toggle-widget]');

	});
	afterEach(function () {
		jQuery('#progressFilterWidget').detach();
	});
	it('should hide the filter ui when initialised', function () {
		expect(filterDom.css('display')).toBe('none');
	});
	describe('toggle button', function () {
		it('should show the filter ui if it is hidden', function () {
			toggleButton.click();
			expect(filterDom.css('display')).not.toBe('none');
		});
		it('should hide the filter ui if it is visible', function () {
			toggleButton.click();
			toggleButton.click();
			expect(filterDom.css('display')).toBe('none');
		});
	});
	describe('when it becomes visible', function () {
		it('subscribes to the model ', function () {
			spyOn(calcModel, 'addEventListener').and.callThrough();
			toggleButton.click();
			expect(calcModel.addEventListener).toHaveBeenCalledWith('dataUpdated', jasmine.any(Function));
		});
	});
	describe('when it is hidden', function () {
		it('unsubscribes from the model', function () {
			toggleButton.click();
			spyOn(calcModel, 'removeEventListener').and.callThrough();
			toggleButton.click();
			expect(calcModel.removeEventListener).toHaveBeenCalledWith('dataUpdated', jasmine.any(Function));
		});
	});
	describe('updating UI', function () {
		var newConfig = {
			passed: {description: 'Passed desc', style: {background: 'rgb(0, 0, 255)'}},
			failed: {description: 'Failed desc', priority: 1, icon: {url: 'http://failedurl' }, style: {background: 'rgb(255, 0, 0)'}}
		};
		it('binds to an ConfigStatusUpdater and updates the UI on configChanged', function () {
			configStatusUpdater.dispatchEvent('configChanged', newConfig);
			var rows = filterDom.find('[data-mm-role=status-list] tr');
			expect(rows.length).toBe(2);
			expect(rows.first().find('td:eq(1)').text()).toEqual('Failed desc');
			expect(rows.first().find('input').prop('value')).toEqual('failed');
			expect(rows.eq(1).find('td:eq(1)').text()).toEqual('Passed desc');
			expect(rows.eq(1).find('input').prop('value')).toEqual('passed');
		});
		it('clears out any existing rows from the status list when updating', function () {
			filterDom.find('[data-mm-role=status-list]').html('<tr><td>H</td></tr>');
			configStatusUpdater.dispatchEvent('configChanged', newConfig);
			var rows = filterDom.find('[data-mm-role=status-list] tr');
			expect(rows.length).toBe(2);
		});
		it('hides itself if progress status is not configured', function () {
			underTest.show();
			configStatusUpdater.dispatchEvent('configChanged', false);
			expect(underTest.css('display')).toBe('none');
		});
		it('shows itself if progress status is defined', function () {
			underTest.hide();
			configStatusUpdater.dispatchEvent('configChanged', newConfig);
			expect(underTest.css('display')).not.toBe('none');
		});
	});
	describe('updates the model with the filter when it changed in the ui', function () {
		var newConfig = {passed: {priority: 1}, failed: {}},
			statusCheckboxes,
			toggleCheckboxes;
		beforeEach(function () {
			toggleButton.click();
			configStatusUpdater.dispatchEvent('configChanged', newConfig);
			statusCheckboxes = filterDom.find('input[data-mm-role=status-checkbox]').prop('checked', false);
			toggleCheckboxes = filterDom.find('[data-mm-role=toggle-property]');
		});
		it('sends the filter containing a list of checked checkboxes on any checkbox click', function () {
			statusCheckboxes.first().click();
			expect(calcModel.setFilter).toHaveBeenCalledWith({statuses: ['passed']});
		});
		it('sends the filter containing toggled properties', function () {
			toggleCheckboxes.first().click();
			expect(calcModel.setFilter).toHaveBeenCalledWith({statuses: [], firstProp: true});
		});
		it('removes the statuses property if all checkboxes are checked', function () {
			statusCheckboxes.first().click();
			calcModel.setFilter.calls.reset();
			statusCheckboxes.eq(1).click();
			expect(calcModel.setFilter).toHaveBeenCalledWith({});
		});
		it('selects all statuses when select all statuses button is clicked', function () {
			filterDom.find('[data-mm-role=select-all-statuses]').click();
			expect(calcModel.setFilter).toHaveBeenCalledWith({});
		});
	});
	describe('updates the ui when the model publishes a changed filter', function () {
		var newConfig = {passed: {}, failed: {}},
			statusCheckboxes,
			toggleCheckboxes;
		beforeEach(function () {
			toggleButton.click();
			configStatusUpdater.dispatchEvent('configChanged', newConfig);
			statusCheckboxes = filterDom.find('[data-mm-role=status-list] input');
			toggleCheckboxes = filterDom.find('[data-mm-role=toggle-property]');
		});
		it('checks all the check boxes if there is no status filter', function () {
			calcModel.dispatchEvent('dataUpdated', [], undefined);
			expect(statusCheckboxes.filter(':checked').length).toBe(2);
		});
		it('unchecks all the check boxes if the filter contains an empty status array', function () {
			calcModel.dispatchEvent('dataUpdated', [], {statuses: []});
			expect(statusCheckboxes.filter(':checked').length).toBe(0);
		});
		it('checks all the check boxes if the filter does not contain a status array', function () {
			calcModel.dispatchEvent('dataUpdated', [], {});
			expect(statusCheckboxes.filter(':checked').length).toBe(2);
		});
		it('checks only the statuses from the status array if defined', function () {
			calcModel.dispatchEvent('dataUpdated', [], {statuses: ['passed']});
			expect(statusCheckboxes.filter(':checked').length).toBe(1);
			expect(statusCheckboxes.filter(':checked').prop('value')).toBe('passed');
		});
		it('unchecks the statuses that are not in the list', function () {
			statusCheckboxes.prop('checked', true);
			calcModel.dispatchEvent('dataUpdated', [], {statuses: ['passed']});
			expect(statusCheckboxes.filter(':checked').length).toBe(1);
			expect(statusCheckboxes.filter(':checked').prop('value')).toBe('passed');
		});
		it('hides the select all button if all the stauses are selected', function () {
			calcModel.dispatchEvent('dataUpdated', [], {});
			expect(filterDom.find('[data-mm-role=select-all-statuses]').css('visibility')).toBe('hidden');
		});
		it('shows the select all button if some the stauses are deselected', function () {
			calcModel.dispatchEvent('dataUpdated', [], {statuses: ['passed']});
			expect(filterDom.find('[data-mm-role=select-all-statuses]').css('visibility')).not.toBe('hidden');
		});
		it('checks any data-mm-role=toggle-property checkboxes supplied with the filter', function () {
			toggleCheckboxes.prop('checked', false);
			calcModel.dispatchEvent('dataUpdated', [], {firstProp: true});
			expect(toggleCheckboxes.filter('[value=firstProp]').is(':checked')).toBeTruthy();
			expect(toggleCheckboxes.filter('[value=secondProp]').is(':checked')).toBeFalsy();
		});
		it('unchecks any data-mm-role=toggle-property checkboxes not supplied with the filter', function () {
			toggleCheckboxes.prop('checked', true);
			calcModel.dispatchEvent('dataUpdated', [], {firstProp: true});
			expect(toggleCheckboxes.filter('[value=firstProp]').is(':checked')).toBeTruthy();
			expect(toggleCheckboxes.filter('[value=secondProp]').is(':checked')).toBeFalsy();
		});
		it('does not cause a round-trip', function () {
			calcModel.dispatchEvent('dataUpdated', [], {statuses: ['passed']});
			expect(calcModel.setFilter).not.toHaveBeenCalled();
		});
	});
});

describe('MM.sortProgressConfig', function () {
	'use strict';
	it('orders by priority, highest priority first, then items without priority in alphabetic order', function () {
		var config = {
			'y': {description: 'ZZZ', style: {background: 'rgb(255, 0, 0)'}},
			'z': {description: 'AAA', style: {background: 'rgb(255, 0, 0)'}},
			'x': {description: 'MMM', style: {background: 'rgb(255, 0, 0)'}},
			'k777': {description: 'F', priority: 777, style: {background: 'rgb(255, 0, 0)'}},
			'k999': {description: 'F', priority: 999, style: {background: 'rgb(255, 0, 0)'}},
			'k888': {description: 'F', priority: 888, style: {background: 'rgb(255, 0, 0)'}}
		}, result;
		result = MM.sortProgressConfig(config);
		expect(_.map(result, function (e) {
			return e.key;
		})).toEqual(['k999', 'k888', 'k777', 'z', 'x', 'y']);
	});
	it('flattens hash map into an array and adds the key element to each item', function () {
		var config = {
			'y': {description: 'ZZZ', style: {background: 'rgb(255, 0, 0)'}}
		};
		expect(MM.sortProgressConfig(config)).toEqual([{description: 'ZZZ', style: {background: 'rgb(255, 0, 0)'}, key: 'y'}]);
	});
});


describe('MM.progressCalcChangeMediator', function () {
	'use strict';
	var activeContent, mapModel, calcModel, filter, progressConfigUpdater, mapController, activeContentListener;
	beforeEach(function () {
		filter = {};
		calcModel = {
			dataUpdated: jasmine.createSpy('dataUpdated'),
			getFilter: function () {
				return filter;
			},
			setFilter: jasmine.createSpy('setFilter')
		};
		mapModel = observable({});
		progressConfigUpdater = observable({});
		mapController = observable({});
		activeContentListener = new MM.ActiveContentListener(mapController);
		activeContent = MAPJS.content({id: 1});
		MM.progressCalcChangeMediator(calcModel, activeContentListener, mapModel, progressConfigUpdater);
		mapController.dispatchEvent('mapLoaded', 'testID', activeContent);
		calcModel.dataUpdated.calls.reset();
	});
	it('calls calcModel.setFilter when progress config changes', function () {
		progressConfigUpdater.dispatchEvent('configChanged');
		expect(calcModel.setFilter).toHaveBeenCalledWith({});
	});
	describe('calls calcModel.dataUpdated when', function () {
		it('the progress status of any node changes', function () {
			activeContent.updateAttr(1, 'status', 'yellow');
			expect(calcModel.dataUpdated).toHaveBeenCalledWith(activeContent);
		});
		it('a new map is loaded', function () {
			mapController.dispatchEvent('mapLoaded', 'testID2', activeContent);
			expect(calcModel.dataUpdated).toHaveBeenCalledWith(activeContent);
		});
		it('the active id changes and the filter is for subtree', function () {
			filter.selectedSubtree = true;
			mapModel.dispatchEvent('nodeSelectionChanged', 1);
			expect(calcModel.dataUpdated).toHaveBeenCalledWith(activeContent);
		});
	});
	describe('does not call calcModel.dataUpdated when', function () {
		it('a new map has been loaded and the old content changes', function () {
			mapController.dispatchEvent('mapLoaded', 'testID2', MAPJS.content({id: 1}));
			calcModel.dataUpdated.calls.reset();
			activeContent.updateAttr(1, 'status', 'yellow');
			expect(calcModel.dataUpdated).not.toHaveBeenCalled();
		});
		it('the active id changes and the filter is not  for subtree', function () {
			mapModel.dispatchEvent('nodeSelectionChanged', 1);
			expect(calcModel.dataUpdated).not.toHaveBeenCalledWith(activeContent);
		});
	});
});
describe('MM.CalcModel', function () {
	'use strict';
	var underTest, activeContent, aggregation, filter, projections, calc, activityLog;
	beforeEach(function () {
		activityLog = { log: jasmine.createSpy('log') };
		filter = {some: {complex: ['object']}};
		activeContent = MAPJS.content({id: 1});
		aggregation = [['foo', 1]];
		projections = [
			{name: 'Counts', 'iterator': jasmine.createSpy('counts').and.returnValue(aggregation)},
			{name: 'Percentages', 'iterator': jasmine.createSpy('percentages').and.returnValue(aggregation)}
		];
		calc = {
			dataAdapter: jasmine.createSpy('calculate').and.returnValue(aggregation),
			getProjectionsFor: jasmine.createSpy('getProjectionsFor').and.returnValue(projections)
		};
		underTest = new MM.CalcModel(calc, activityLog);
		underTest.setFilter(filter);
	});
	describe('getFilterPredicate', function () {
		it('retrieves a list of IDs from the active data adapter and converts into a predicate function that returns true for contained IDs', function () {
			calc.dataAdapter.and.returnValue([
				{ status: 'k888', id: 1, title: 'one'},
				{ status: 'k777', id: 114, title: 'one hundred and fourteen'}
			]);
			underTest.dataUpdated(activeContent);
			var result = underTest.getFilterPredicate();
			expect(result({id: 1})).toBe(true);
			expect(result({id: 114})).toBe(true);
			expect(result({id: 2})).toBe(false);
		});
	});
	describe('projections', function () {
		var listener;
		beforeEach(function () {
			listener = jasmine.createSpy('listener');
			underTest.dataUpdated(activeContent);
			underTest.addEventListener('projectionsChanged', listener);
		});
		it('logs when the projection is changed', function () {
			underTest.setActiveProjection('Percentages');
			expect(activityLog.log).toHaveBeenCalledWith('CalcModel', 'Projection:Percentages');
		});

		it('should publish a list of projections when they have changed', function () {
			calc.getProjectionsFor.and.returnValue([
				{name: 'Count1', 'iterator': jasmine.createSpy('count1').and.returnValue(aggregation)}
			]);
			listener.calls.reset();
			underTest.dataUpdated(activeContent);

			expect(listener).toHaveBeenCalledWith(['Count1']);
		});
		it('should change the active projection to the first name in the list if the current active projection is not valid', function () {
			calc.getProjectionsFor.and.returnValue([
				{name: 'Count1', 'iterator': jasmine.createSpy('count1').and.returnValue(aggregation)},
				{name: 'Percentages1', 'iterator': jasmine.createSpy('percentages').and.returnValue(aggregation)}
			]);
			underTest.dataUpdated(activeContent);
			expect(underTest.getActiveProjection()).toEqual('Count1');
		});
		it('should retain the current active projection if it is in the list', function () {
			underTest.setActiveProjection('Percentages');
			calc.getProjectionsFor.and.returnValue([
				{name: 'Count1', 'iterator': jasmine.createSpy('count1').and.returnValue(aggregation)},
				{name: 'Percentages', 'iterator': jasmine.createSpy('percentages').and.returnValue(aggregation)}
			]);
			underTest.dataUpdated(activeContent);
			expect(underTest.getActiveProjection()).toEqual('Percentages');

		});
		it('should not publish list of projections if they have not changed', function () {
			listener.calls.reset();
			underTest.dataUpdated(activeContent);
			expect(listener).not.toHaveBeenCalled();
		});
		it('should default to first projection', function () {
			expect(underTest.getActiveProjection()).toEqual('Counts');
		});
		it('should change the active projections', function () {
			underTest.setActiveProjection('Percentages');
			expect(underTest.getActiveProjection()).toEqual('Percentages');
		});
		it('should not change the active projections if an invalid name is supplied', function () {
			underTest.setActiveProjection('foo');
			expect(underTest.getActiveProjection()).toEqual('Counts');
		});
		describe('should use the active projection when publishing the active data', function () {
			var projectionResults = [
					[['bar', 1]],
					[['bar', 100]]
				],
				listener = jasmine.createSpy('one');
			beforeEach(function () {
				projections[0].iterator.and.returnValue(projectionResults[0]);
				projections[1].iterator.and.returnValue(projectionResults[1]);
				underTest.dataUpdated(activeContent);
			});
			it(' when a new listener is added', function () {
				underTest.addEventListener('dataUpdated', listener, filter);
				expect(projections[0].iterator).toHaveBeenCalledWith(aggregation);
				expect(listener).toHaveBeenCalledWith(projectionResults[0], filter);
			});
			it('when the data is recalculated', function () {
				underTest.addEventListener('dataUpdated', jasmine.createSpy('one'), filter);
				projections[0].iterator.calls.reset();
				underTest.dataUpdated(activeContent);
				expect(projections[0].iterator).toHaveBeenCalledWith(aggregation);
				expect(listener).toHaveBeenCalledWith(projectionResults[0], filter);
			});
			it('when the projection is changed', function () {
				underTest.addEventListener('dataUpdated', listener, filter);
				projections[0].iterator.calls.reset();
				listener.calls.reset();
				underTest.setActiveProjection('Percentages');
				expect(projections[1].iterator).toHaveBeenCalledWith(aggregation);
				expect(listener).toHaveBeenCalledWith(projectionResults[1], filter);
			});
		});
		it('should not be called if the activeProjection is changed to the same one as currently set', function () {
			var listener = jasmine.createSpy('one');
			underTest.addEventListener('dataUpdated', listener, filter);
			projections[0].iterator.calls.reset();
			listener.calls.reset();
			underTest.setActiveProjection('Counts');
			expect(projections[1].iterator).not.toHaveBeenCalled();
			expect(listener).not.toHaveBeenCalled();
		});
	});
	describe('publishing update events when content changes', function () {
		describe('when has no listeners', function () {
			it('does not recalculate when dataUpdated', function () {
				underTest.dataUpdated(activeContent);
				expect(calc.dataAdapter).not.toHaveBeenCalled();
			});
			it('does not not recalculate when the filter is changed, but does store the filter', function () {
				var newFilter = 'newFilter';
				underTest.setFilter(newFilter);
				expect(calc.dataAdapter).not.toHaveBeenCalled();
				expect(underTest.getFilter()).toBe(newFilter);
			});
		});
		describe('logging the active projectioin on first listener', function () {
			beforeEach(function () {
				underTest.dataUpdated(activeContent);
				underTest.addEventListener('dataUpdated', jasmine.createSpy('one'));
			});
			it('logs the active projection when the first listener is added', function () {
				expect(activityLog.log).toHaveBeenCalledWith('CalcModel', 'Projection:Counts');
			});
			it('does not log the active projection when subsequent listeners are added', function () {
				activityLog.log.calls.reset();
				underTest.addEventListener('dataUpdated', jasmine.createSpy('two'));
				expect(activityLog.log).not.toHaveBeenCalled();
			});
		});

		describe('when it gets a listener', function () {
			var listenerOne, listenerTwo;
			beforeEach(function () {
				listenerOne = jasmine.createSpy('one');
				listenerTwo = jasmine.createSpy('one');
				underTest.addEventListener('dataUpdated', listenerOne);
			});

			describe('when there is activeContent', function () {
				beforeEach(function () {
					underTest.dataUpdated(activeContent);
					listenerOne.calls.reset();
					underTest.addEventListener('dataUpdated', listenerTwo);
				});

				it('publishes a dataUpdated event immediately to that listener if there was data loaded before', function () {
					expect(listenerTwo).toHaveBeenCalledWith(aggregation, filter);
				});

				it('does not publish a dataUpdated event to any other listners', function () {
					expect(listenerOne).not.toHaveBeenCalled();
				});

			});
			describe('when there is not activeContent', function () {
				beforeEach(function () {
					listenerOne.calls.reset();
					underTest.addEventListener('dataUpdated', listenerTwo);
				});
				it('does not publish if there is no activeContent', function () {
					expect(listenerTwo).not.toHaveBeenCalled();
					expect(listenerOne).not.toHaveBeenCalled();
				});

			});

		});
		describe('when first listener is added', function () {
			var listenerOne;
			it('recalculates the table', function () {
				var newFilter = 'new filter';
				underTest.dataUpdated(activeContent);
				underTest.setFilter(newFilter);
				listenerOne = jasmine.createSpy('one');
				underTest.addEventListener('dataUpdated', listenerOne);

				expect(calc.dataAdapter).toHaveBeenCalledWith(activeContent, newFilter);
				expect(listenerOne).toHaveBeenCalledWith(aggregation, newFilter);
			});
		});
		describe('when it has listeners', function () {
			var listenerOne;
			beforeEach(function () {
				listenerOne = jasmine.createSpy('one');
				underTest.dataUpdated(activeContent);
				underTest.addEventListener('dataUpdated', listenerOne);
				listenerOne.calls.reset();
				calc.dataAdapter.calls.reset();
			});
			it('published the dataUpdatedEvent if the filter is changed', function () {
				underTest.setFilter('newFilter');
				expect(calc.dataAdapter).toHaveBeenCalledWith(activeContent, 'newFilter');
				expect(listenerOne).toHaveBeenCalledWith(aggregation, 'newFilter');
			});
			it('does not publish a dataUpdatedEvent if the filter is set to the previous filter', function () {
				underTest.setFilter({some: {complex: ['object']}});
				expect(calc.dataAdapter).not.toHaveBeenCalled();
				expect(listenerOne).not.toHaveBeenCalled();
			});
			it('publishes a dataUpdated event if the dataUpdated', function () {
				underTest.dataUpdated(activeContent);
				expect(calc.dataAdapter).toHaveBeenCalledWith(activeContent, filter);
				expect(listenerOne).toHaveBeenCalledWith(aggregation, filter);
			});
		});
	});
});


describe('Calc widget', function () {
	'use strict';

	var template =	'<div id="calcWidget1" class="modal" >' +
					'<span data-mm-role="active-projection" ></span>' +
					'<ul data-mm-role="projections"><li data-mm-role="projection-template"><a data-mm-role="projection-name"></a></li></ul>' +
					'<table data-mm-role="calc-table">'	+
					'	<tr data-mm-role="row-template">' +
					'		<td data-mm-role="cell"><span data-mm-role="value" /></td>' +
					'	</tr>' +
					'</table>' +
					'<div data-mm-role="empty">BLA!</div>' +
					'<div data-mm-role="total"><span data-mm-role="total-value">FLA!</span></div>' +
					'<button data-mm-role="open-measurements"></button>' +
					'</div>',
		openButtonTemplate = '<button data-mm-role="toggle-widget" data-mm-calc-id="calcWidget1"></button>',
		underTest,
		toggleButton,
		calcModel,
		tableDOM,
		totalElement,
		msgDiv,
		projections,
		simpleTable,
		measureModel,
		checkContents = function (dataTable) {
			expect(tableDOM.find('tr').length).toBe(dataTable.length);
			_.each(dataTable, function (row, rowindex) {
				expect(tableDOM.find('tr:eq(' + rowindex + ') td').length).toBe(row.length);
				_.each(row, function (cell, cellindex) {
					expect(tableDOM.find('tr:eq(' + rowindex + ') td:eq(' + cellindex + ') span').text()).toEqual(cell.toString());
				});
			});
		};
	beforeEach(function () {
		projections = ['projection1', 'projection2'];
		calcModel = observable({
			getProjections: jasmine.createSpy('getProjections').and.returnValue(projections),
			getActiveProjection: jasmine.createSpy('getActiveProjection'),
			setActiveProjection: jasmine.createSpy('setActiveProjection')
		});
		measureModel = jasmine.createSpyObj('measureModel', ['editWithFilter']);
		toggleButton = jQuery(openButtonTemplate).appendTo('body');
		underTest = jQuery(template).appendTo('body').calcWidget(calcModel, measureModel);
		tableDOM = underTest.find('[data-mm-role=calc-table]');
		totalElement = underTest.find('[data-mm-role=total]');
		msgDiv = underTest.find('[data-mm-role=empty]');
		simpleTable = [
			['first', 2],
			['second', 4]
		];
	});
	afterEach(function () {
		jQuery('#calcWidget1').detach();
		jQuery('[data-mm-role=toggle-widget]').detach();
	});
	describe('shows the progress status counts when it becomes visible', function () {
		it('creates data rows for each table row inside data-mm-role=counts-table', function () {
			toggleButton.click();
			calcModel.dispatchEvent('dataUpdated', simpleTable);
			checkContents(simpleTable);
		});
		it('removes any previous content from data-mm-role=counts-table', function () {
			tableDOM.html('<tr><td>hey</td><td>there</td></tr>');
			toggleButton.click();
			calcModel.dispatchEvent('dataUpdated', simpleTable);
			checkContents(simpleTable);
		});

	});
	describe('open in measurements', function () {
		it('triggers the measures model and sets the filter to the predicate from calc model', function () {
			calcModel.getFilterPredicate = jasmine.createSpy('getFilterIterator').and.returnValue('PREDICATE1');
			underTest.find('[data-mm-role=open-measurements]').click();
			expect(measureModel.editWithFilter).toHaveBeenCalledWith('PREDICATE1');
		});
	});
	describe('totals', function () {
		beforeEach(function () {
			toggleButton.click();
		});
		describe('hiding the total element', function () {
			beforeEach(function () {
				totalElement.show();
			});
			it('should hide the total element if there is not a total', function () {
				calcModel.dispatchEvent('dataUpdated', simpleTable);
				expect(totalElement.css('display')).toBe('none');
			});
			it('should hide the total element if the data is empty', function () {
				calcModel.dispatchEvent('dataUpdated', []);
				expect(totalElement.css('display')).toBe('none');
			});
			it('should hide the total element if the data is undefined', function () {
				calcModel.dispatchEvent('dataUpdated');
				expect(totalElement.css('display')).toBe('none');
			});
		});
		describe('when there is a total', function () {
			var spy;
			beforeEach(function () {
				spy = jasmine.createSpy('editor').and.returnValue(42);
				simpleTable.total = spy;
				calcModel.dispatchEvent('dataUpdated', simpleTable);
			});
			it('should show the total element ', function () {
				expect(totalElement.css('display')).not.toBe('none');
			});
			it('should set the value of the total element ', function () {
				expect(totalElement.find('[data-mm-role=total-value]').text()).toBe('42');
			});

		});
	});
	describe('projections', function () {
		describe('when projections are changed', function () {
			beforeEach(function () {
				calcModel.dispatchEvent('projectionsChanged', projections);
			});
			it('shows a list of projections, supplied by the model', function () {
				var rows = underTest.find('[data-mm-role=projections] li');
				expect(rows.length).toBe(2);
				expect(rows.first().find('[data-mm-role=projection-name]').text()).toEqual('projection1');
				expect(rows.eq(1).find('[data-mm-role=projection-name]').text()).toEqual('projection2');
			});
			it('adds a click event handler to send the projection name to the model', function () {
				var rows = underTest.find('[data-mm-role=projections] li a');
				rows.eq(1).click();
				expect(calcModel.setActiveProjection).toHaveBeenCalledWith('projection2');
			});
			it('should remove previously set projections',  function () {
				calcModel.dispatchEvent('projectionsChanged', ['projection3', 'projection4']);
				var rows = underTest.find('[data-mm-role=projections] li');
				expect(rows.length).toBe(2);
				expect(rows.first().find('[data-mm-role=projection-name]').text()).toEqual('projection3');
				expect(rows.eq(1).find('[data-mm-role=projection-name]').text()).toEqual('projection4');
			});
		});
		it('changes the label to the active projection when a dataUpdated event is recieved', function () {
			calcModel.getActiveProjection.and.returnValue('projection2');
			toggleButton.click();
			calcModel.dispatchEvent('dataUpdated', simpleTable);
			expect(underTest.find('[data-mm-role=active-projection]').text()).toEqual('projection2');
		});
	});
	describe('graceful handling of no data in the report', function () {
		beforeEach(function () {
			toggleButton.click();
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
		toggleButton.click();
		calcModel.dispatchEvent('dataUpdated', [[1, 2]]);
		calcModel.dispatchEvent('dataUpdated', simpleTable);
		checkContents(simpleTable);
	});
	it('removes itself as a listener from the model when it is hidden', function () {
		toggleButton.click();
		calcModel.dispatchEvent('dataUpdated', simpleTable);
		spyOn(calcModel, 'removeEventListener').and.callThrough();
		toggleButton.click();
		calcModel.dispatchEvent('dataUpdated', [[1, 2]]);

		expect(calcModel.removeEventListener).toHaveBeenCalled();
		checkContents(simpleTable);
	});
});
