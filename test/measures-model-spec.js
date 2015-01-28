/*global describe, MM, MAPJS, beforeEach, observable, it, expect, jasmine, _, spyOn*/
describe('MM.MeasuresModel', function () {
	'use strict';
	var underTest,
		mapController,
		activeContent,
		content;
	beforeEach(function () {
		mapController = observable({});
		underTest = new MM.MeasuresModel('measurement-names', 'measurement-vals', new MM.ActiveContentListener(mapController));
		content = {
			id: 1,
			title: 'one',
			attr:	{
				'measurement-names': ['Speed', 'Efficiency'],
				'measurement-vals': {'Speed': 100, 'Efficiency': 'wut?'}
			},
			ideas: {
				11: {
					id: 11,
					title: 'with values',
					attr: {'measurement-vals': {'Speed': 1, 'Efficiency': 2} }
				},
				12: {
					id: 12,
					title: 'no values',
					ideas: {
						121: {
							id: 121,
							title: 'one twenty one',
							attr: {'measurement-vals': {'Efficiency': -1}}
						}
					}

				}
			}

		};
		activeContent = MAPJS.content(JSON.parse(JSON.stringify(content)));
	});

	describe('getRawData', function () {
		it('returns an empty array when no active content', function () {
			expect(underTest.getRawData()).toEqual([]);
		});
		it('retrieves all data in a two-dim array when no filter is used', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
			expect(underTest.getRawData()).toEqual([
				['Name', 'Speed', 'Efficiency'],
				['one', 100, undefined],
				['with values', 1, 2],
				['no values', undefined, undefined],
				['one twenty one', undefined, -1]
			]);
		});
		it('retrieves only filtered data in a two-dim array when filter is used', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
			underTest.editWithFilter({predicate: function (idea) {
				return idea.id === 121;
			}});
			expect(underTest.getRawData()).toEqual([
				['Name', 'Speed', 'Efficiency'],
				['one twenty one', undefined, -1]
			]);
		});
		it('retrieves all data in a two-dim array when ignore filter flag is used', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
			underTest.editWithFilter({predicate: function (idea) {
				return idea.id === 121;
			}});
			expect(underTest.getRawData(true)).toEqual([
				['Name', 'Speed', 'Efficiency'],
				['one', 100, undefined],
				['with values', 1, 2],
				['no values', undefined, undefined],
				['one twenty one', undefined, -1]
			]);
		});
		it('returns a list of titles when there are no measures defined', function () {
			activeContent.attr['measurement-names'] = false;
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
			expect(underTest.getRawData()).toEqual([
				['Name'],
				['one'],
				['with values'],
				['no values'],
				['one twenty one']
			]);

		});
	});
	describe('getMeasures', function () {
		it('returns an empty array when there is no active content', function () {
			expect(underTest.getMeasures()).toEqual([]);
		});
		it('returns the current value of the measurement config attribute when an active content is loaded', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', MAPJS.content({ attr: { 'measurement-names': ['Speed', 'Efficiency']} }));
			expect(underTest.getMeasures()).toEqual(['Speed', 'Efficiency']);
		});
		it('returns the value associated with a new content after the content is reloaded', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', MAPJS.content({ attr: { 'measurement-names': ['Speed', 'Efficiency']} }));
			mapController.dispatchEvent('mapLoaded', 'mapId2', MAPJS.content({ attr: { 'measurement-names': ['Power', 'Efficiency']} }));
			expect(underTest.getMeasures()).toEqual(['Power', 'Efficiency']);
		});
		it('returns the current array even when the value changes after loading', function () {
			var activeContent = MAPJS.content({id: 1, attr: { 'measurement-names': ['Speed', 'Efficiency']} });
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
			activeContent.updateAttr(1, 'measurement-names', ['Power', 'Efficiency']);
			expect(underTest.getMeasures()).toEqual(['Power', 'Efficiency']);
		});
		it('returns an empty array if the currently active content does not contain the configured attribute', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', MAPJS.content({}));
			expect(underTest.getMeasures()).toEqual([]);
		});
		it('returns an empty array if the currently active content contains a false value for the configured attribute', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', MAPJS.content({ attr: { 'measurement-names': false} }));
			expect(underTest.getMeasures()).toEqual([]);
		});

	});
	describe('addUpMeasurementForAllNodes', function () {
		beforeEach(function () {
			content = {
				id: 1,
				title: 'one',
				attr:	{
					'measurement-names': ['Speed', 'Efficiency'],
					'measurement-vals': {'Speed': 100}
				},
				ideas: {
					11: {
						id: 11,
						title: 'with values',
						attr: {'measurement-vals': {'Speed': 1, 'Efficiency': 2} }
					},
					12: {
						id: 12,
						title: 'no values',
						ideas: {
							121: {
								id: 121,
								title: 'one twenty one',
								attr: {'measurement-vals': {'Efficiency': -1}}
							}
						}
					},
					13: {
						id: 13,
						title: 'adds up to 0',
						attr: {'measurement-vals': {'Efficiency': -1}}
					},
					14: {
						id: 14,
						title: 'only notes, no measures',
						ideas: {
							141: {
								id: 141,
								title: 'one four one'
							}
						}
					}
				}

			};
			activeContent = MAPJS.content(JSON.parse(JSON.stringify(content)));
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
		});
		it('returns a numeric total for measurement values addd up the tree for the selected measure', function () {
			expect(underTest.addUpMeasurementForAllNodes('Speed')).toEqual({1: 101, 11: 1});

		});
		it('shows zeros only when the total adds up to zero, not when the measure is missing', function () {
			expect(underTest.addUpMeasurementForAllNodes('Efficiency')).toEqual({1: 0, 11: 2, 12: -1, 121: -1, 13: -1});
		});
	});
	describe('editWithFilter', function () {
		it('sets filter with node ids', function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
			underTest.editWithFilter(MM.MeasuresModel.filterByIds([1, 121]));
			expect(underTest.getMeasurementValues()).toEqual([
				{id: 1, title: 'one', values: {'Speed': 100}},
				{id: 121, title: 'one twenty one', values: {'Efficiency': -1}}
			]);
		});
		it('listens for changes to filtered rows', function () {
			var filter = jasmine.createSpyObj('filter', ['predicate', 'addEventListener']);
			underTest.editWithFilter(filter);
			expect(filter.addEventListener).toHaveBeenCalledWith('filteredRowsChanged', jasmine.any(Function));
		});
	});
	describe('removeFilter', function () {
		beforeEach(function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
			underTest.editWithFilter(MM.MeasuresModel.filterByIds([1, 121]));
			underTest.removeFilter();
		});
		it('returns entire map when measurements are retrieved', function () {
			expect(underTest.getMeasurementValues()).toEqual([
				{id: 1, title: 'one', values: {'Speed': 100}},
				{id: 11, title: 'with values', values: {'Speed': 1, 'Efficiency': 2}},
				{id: 12, title: 'no values', values: {}},
				{id: 121, title: 'one twenty one', values: {'Efficiency': -1}}
			]);
		});
	});

	describe('getMeasurementValues', function () {
		it('returns an empty array when no content is loaded', function () {
			expect(underTest.getMeasurementValues()).toEqual([]);
		});
		describe('when no filter is defined', function () {
			it('flattens out the whole content and retrieves title, id and measurement values', function () {
				mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
				expect(underTest.getMeasurementValues()).toEqual([
					{id: 1, title: 'one', values: {'Speed': 100}},
					{id: 11, title: 'with values', values: {'Speed': 1, 'Efficiency': 2}},
					{id: 12, title: 'no values', values: {}},
					{id: 121, title: 'one twenty one', values: {'Efficiency': -1}}
				]);

			});
		});
	});
	describe('activeContent changes', function () {
		var listener;
		beforeEach(function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
			listener = jasmine.createSpy('listener');
		});
		describe('when measures are added', function () {
			beforeEach(function () {
				underTest.addEventListener('measureAdded', listener);
			});

			it('should dispatch an event', function () {
				activeContent.updateAttr(activeContent.id, 'measurement-names', ['Speed', 'readies', 'Efficiency']);
				expect(listener).toHaveBeenCalledWith('readies', 1);
			});
			it('should dispatch muptiple events', function () {
				activeContent.updateAttr(activeContent.id, 'measurement-names', ['Speed', 'readies', 'pretty green', 'Efficiency', 'change']);
				expect(listener.calls.count()).toBe(3);
				expect(listener.calls.argsFor(0)).toEqual(['readies', 1]);
				expect(listener.calls.argsFor(1)).toEqual(['pretty green', 2]);
				expect(listener.calls.argsFor(2)).toEqual(['change', 4]);
			});
			it('should not dispatch events when the old content is changed', function () {
				mapController.dispatchEvent('mapLoaded', 'mapId', MAPJS.content(content));
				listener.calls.reset();
				activeContent.updateAttr(activeContent.id, 'measurement-names', ['Speed', 'readies', 'Efficiency']);
				expect(listener).not.toHaveBeenCalled();
				expect(activeContent.listeners('changed').length).toBe(0);
			});
		});
		describe('when measures are removed', function () {
			beforeEach(function () {
				underTest.addEventListener('measureRemoved', listener);
			});
			it('should dispatch an event', function () {
				activeContent.updateAttr(activeContent.id, 'measurement-names', ['Efficiency']);
				expect(listener).toHaveBeenCalledWith('Speed');
			});
			it('should dispatch multiple events', function () {
				activeContent.updateAttr(activeContent.id, 'measurement-names', []);
				expect(listener.calls.count()).toBe(2);
				expect(listener).toHaveBeenCalledWith('Speed');
				expect(listener).toHaveBeenCalledWith('Efficiency');
			});
			it('should dispatch multiple events when set to false', function () {
				activeContent.updateAttr(activeContent.id, 'measurement-names', false);
				expect(listener.calls.count()).toBe(2);
				expect(listener).toHaveBeenCalledWith('Speed');
				expect(listener).toHaveBeenCalledWith('Efficiency');
			});
			it('should not dispatch events when the old content is changed', function () {
				mapController.dispatchEvent('mapLoaded', 'mapId', MAPJS.content(content));
				listener.calls.reset();
				activeContent.updateAttr(activeContent.id, 'measurement-names', ['Efficiency']);
				expect(listener).not.toHaveBeenCalled();
				expect(activeContent.listeners('changed').length).toBe(0);
			});
		});
		it('when measures have been added and removed', function () {
			underTest.addEventListener('measureAdded measureRemoved', listener);
			activeContent.updateAttr(activeContent.id, 'measurement-names', ['Efficiency', 'Wedge']);
			expect(listener.calls.count()).toBe(2);
			expect(listener.calls.argsFor(0)).toEqual(['Speed']);
			expect(listener.calls.argsFor(1)).toEqual(['Wedge', 1]);
		});
		describe('when the value of measurements change', function () {
			beforeEach(function () {
				underTest.addEventListener('measureValueChanged', listener);
				underTest.getMeasurementValues();
			});

			it('dispatches an event when filter does not have a restriction on ideas', function () {
				activeContent.mergeAttrProperty(11, 'measurement-vals', 'Speed', 100);
				expect(listener).toHaveBeenCalledWith(11, 'Speed', 100);
			});
			it('dispatches an event when the property is removed', function () {
				activeContent.mergeAttrProperty(11, 'measurement-vals', 'Speed', false);
				expect(listener).toHaveBeenCalledWith(11, 'Speed', 0);
			});
			it('dispatches an event when the property is set to 0', function () {
				activeContent.mergeAttrProperty(11, 'measurement-vals', 'Speed', 0);
				expect(listener).toHaveBeenCalledWith(11, 'Speed', 0);
			});
			it('dispatches an event when the idea is in the current filter', function () {
				underTest.editWithFilter(MM.MeasuresModel.filterByIds([11]));
				listener.calls.reset();
				activeContent.mergeAttrProperty(11, 'measurement-vals', 'Speed', 100);
				expect(listener).toHaveBeenCalledWith(11, 'Speed', 100);
			});
			it('does not dispatch an event when the idea is excluded by the current filter', function () {
				underTest.editWithFilter(MM.MeasuresModel.filterByIds([11]));
				listener.calls.reset();
				activeContent.mergeAttrProperty(1, 'measurement-vals', 'Speed', 100);
				expect(listener).not.toHaveBeenCalled();
			});
			it('dispatches individual events for each value change in the same idea', function () {
				underTest.addMeasure('Defficiency');
				activeContent.updateAttr(11, 'measurement-vals', {'Speed': 100, 'Defficiency': 500});

				expect(listener).toHaveBeenCalledWith(11, 'Speed', 100);
				expect(listener).toHaveBeenCalledWith(11, 'Efficiency', 0);
				expect(listener).toHaveBeenCalledWith(11, 'Defficiency', 500);
			});
			it('does not traverse the content if there are no listeners', function () {
				underTest.removeEventListener('measureValueChanged', listener);
				activeContent.updateAttr(11, 'measurement-vals', {'Speed': 100, 'Defficiency': 500});
				spyOn(activeContent, 'getAttrById');
				spyOn(activeContent, 'traverse');
				spyOn(activeContent, 'findSubIdeaById');
				activeContent.dispatchEvent('changed');
				expect(activeContent.getAttrById).not.toHaveBeenCalled();
				expect(activeContent.traverse).not.toHaveBeenCalled();
				expect(activeContent.findSubIdeaById).not.toHaveBeenCalled();
			});
			it('should not dispatch events when the old content is changed', function () {
				mapController.dispatchEvent('mapLoaded', 'mapId', MAPJS.content(content));
				listener.calls.reset();
				activeContent.updateAttr(11, 'measurement-vals', {'Speed': 100, 'Defficiency': 500});
				expect(listener).not.toHaveBeenCalled();
			});
		});
	});
	describe('addMeasure', function () {
		beforeEach(function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
		});
		it('should add the measure to the attributes of the root node', function () {
			underTest.addMeasure('moolah');
			expect(activeContent.attr['measurement-names']).toEqual(['Speed', 'Efficiency', 'moolah']);
		});
		_.each(['', 'speed', 'SPEED', undefined, ' Speed', ' Speed ', 'Speed ', ' '], function (arg) {
			it('should not allow duplicate or empty measure names such as "' + arg + '"', function () {
				underTest.addMeasure(arg);
				expect(activeContent.attr['measurement-names']).toEqual(['Speed', 'Efficiency']);
			});
		});
	});
	describe('changingValues', function () {
		beforeEach(function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
		});

		var validValues = [12, '12', '-12', -12, '12.1',  '.1', 0.1, '0', 0],
			invalidValues = ['120,000', '', 'a1', '1a', 'hello', undefined, {}, []];
		describe('validate', function () {
			var doCase = function (arg, expectation) {
				it('should return [' + expectation + '] for [' + arg + ']', function () {
					expect(underTest.validate(arg)).toEqual(expectation);
				});
			};
			_.each(validValues,  function (arg) {
				doCase(arg, true);
			});
			_.each(invalidValues,  function (arg) {
				doCase(arg, false);
			});
		});
		describe('setValue', function () {

			_.each(validValues,
			function (arg) {
				it('should send change to activeContent when a valid value like [' + arg + '] is supplied and return the result from the activeContentCall', function () {
					spyOn(activeContent, 'mergeAttrProperty').and.returnValue('hello');
					expect(underTest.setValue(11, 'Speed', arg)).toEqual('hello');
					expect(activeContent.mergeAttrProperty).toHaveBeenCalledWith(11, 'measurement-vals', 'Speed', arg);
				});
			});

			_.each(invalidValues,
			function (arg) {
				it('should return false for [' + arg + ']', function () {
					expect(underTest.setValue(11, 'Speed', arg)).toEqual(false);
				});
				it('should not send change to activeContent when an invalid value like [' + arg + '] is supplied', function () {
					spyOn(activeContent, 'mergeAttrProperty');
					underTest.setValue(11, 'Speed', arg);
					expect(activeContent.mergeAttrProperty).not.toHaveBeenCalled();
				});
			});
		});

	});
	describe('remove measure', function () {
		beforeEach(function () {
			mapController.dispatchEvent('mapLoaded', 'mapId', activeContent);
		});
		it('should remove the measure from the attributes of the root node', function () {
			underTest.removeMeasure('Speed');
			expect(activeContent.attr['measurement-names']).toEqual(['Efficiency']);
		});
		it('should remove all the measure values from all nodes', function () {
			underTest.removeMeasure('Speed');
			expect(activeContent.getAttrById(1, 'measurement-vals')).toEqual({'Efficiency': 'wut?'});
			expect(activeContent.getAttrById(11, 'measurement-vals')).toEqual({'Efficiency': 2});
			expect(activeContent.getAttrById(121, 'measurement-vals')).toEqual({'Efficiency': -1});
		});
		it('does nothing if the measure is non-existent', function () {
			var emptyContent = MAPJS.content({});
			mapController.dispatchEvent('mapLoaded', 'mapId', emptyContent);
			underTest.removeMeasure('Speed');
			expect(emptyContent.attr).toBeFalsy();
		});
		it('undo remove measure should reinstate measure and values', function () {
			underTest.removeMeasure('Speed');
			activeContent.undo();
			expect(activeContent.attr['measurement-names']).toEqual(['Speed', 'Efficiency']);
			expect(activeContent.getAttrById(1, 'measurement-vals')).toEqual({'Speed': 100, 'Efficiency': 'wut?'});
			expect(activeContent.getAttrById(11, 'measurement-vals')).toEqual({'Speed': 1, 'Efficiency': 2});
			expect(activeContent.getAttrById(121, 'measurement-vals')).toEqual({'Efficiency': -1});
		});

	});
});
