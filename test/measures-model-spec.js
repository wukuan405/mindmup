/*global describe, MM, MAPJS, beforeEach, observable, it, expect*/
describe('MM.MeasuresModel', function () {
	'use strict';
	var underTest,
		mapController;
	beforeEach(function () {
		mapController = observable({});
		underTest = new MM.MeasuresModel('measurement-names', 'measurement-vals', mapController);
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

	describe('getMeasurementValues', function () {
		it('returns an empty array when no content is loaded', function () {
			expect(underTest.getMeasurementValues()).toEqual([]);
		});
		describe('when no filter is defined', function () {
			it('flattens out the whole content and retrieves title, id and measurement values', function () {
				mapController.dispatchEvent('mapLoaded', 'mapId', MAPJS.content({
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

						}
					}

				}));
				expect(underTest.getMeasurementValues()).toEqual([
					{id: 1, title: 'one', values: {'Speed': 100}},
					{id: 11, title: 'with values', values: {'Speed': 1, 'Efficiency': 2}},
					{id: 12, title: 'no values', values: {}},
					{id: 121, title: 'one twenty one', values: {'Efficiency': -1}},
				]);

			});
		});
	});
});
