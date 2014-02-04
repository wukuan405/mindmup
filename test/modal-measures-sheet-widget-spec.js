/*global describe, jasmine, beforeEach, it, jQuery, afterEach, _, expect, fakeBootstrapModal, observable*/
describe('MM.ModalMeasuresSheetWidget', function () {
	'use strict';
	var template =	'<div class="modal">' +
						'<table data-mm-role="measurements-table">' +
							'<thead><tr><th>Name</th><th data-mm-role="measurement-template"><span data-mm-role="measurement-name"></span></th></tr></thead>' +
							'<tbody><tr data-mm-role="idea-template"><th data-mm-role="idea-title"></th><td data-mm-role="value-template"></td></tr></tbody>' +
						'</table>' +
						'<input data-mm-role="measure-to-add"/><a data-mm-role="add-measure"></a>' +
					'</div>',
		underTest,
		measuresModel,
		tableValues = function () {
			return _.map(underTest.find('tbody tr'), function (row) {
				return _.map(jQuery(row).find('td'), function (cell) {
					return jQuery(cell).text();
				});
			});
		},
		tableColumnNames = function () {
			var headerRow = underTest.find('thead tr');
			return _.map(headerRow.children(), function (cell) { return jQuery(cell).text(); });
		};
	beforeEach(function () {
		measuresModel = observable({
			addMeasure: jasmine.createSpy('addMeasure')
		});
		underTest = jQuery(template).appendTo('body').modalMeasuresSheetWidget(measuresModel);
		underTest.modal('hide');
		fakeBootstrapModal(underTest);
	});
	afterEach(function () {
		underTest.detach();
	});
	it('shows itself when the measureModel dispatches a measuresEditRequested event', function () {
		measuresModel.getMeasures = jasmine.createSpy('getMeasures').and.returnValue([]);
		measuresModel.getMeasurementValues = jasmine.createSpy('measurementValues').and.returnValue([]);
		measuresModel.dispatchEvent('measuresEditRequested');
		expect(underTest.is(':visible')).toBeTruthy();
	});
	describe('when loaded from a map with no measures', function () {
		beforeEach(function () {
			measuresModel.getMeasures = jasmine.createSpy('getMeasures').and.returnValue([]);
			measuresModel.getMeasurementValues = jasmine.createSpy('measurementValues').and.returnValue([
				{id: '77.session1', title: 'ron'},
				{id: 1,				title: 'tom'},
				{id: 2,				title: 'mike'}
			]);
			underTest.modal('show');
		});
		it('shows an empty table', function () {
			expect(tableValues()).toEqual([
				[],
				[],
				[]
			]);
			expect(tableColumnNames()).toEqual(['Name']);
		});
	});
	describe('when loaded', function () {
		beforeEach(function () {
			measuresModel.getMeasures = jasmine.createSpy('getMeasures').and.returnValue(['Cost', 'Profit']);
			measuresModel.getMeasurementValues = jasmine.createSpy('measurementValues').and.returnValue([
				{id: '77.session1', title: 'ron',	values: { 'Cost': 100 }},
				{id: 1,				title: 'tom',	values: { 'Cost': 200, 'Profit': 300 }},
				{id: 2,				title: 'mike',	values: { 'Profit': 22 }}
			]);
			underTest.modal('show');
		});
		it('shows a table with measurements in the first row, keeping any non template elements', function () {

			expect(tableColumnNames()).toEqual(['Name', 'Cost', 'Profit']);
		});
		it('shows active idea titles in the first column', function () {
			var ideaNames = underTest.find('[data-mm-role=idea-title]');
			expect(_.map(ideaNames, function (cell) { return jQuery(cell).text(); })).toEqual(['ron', 'tom', 'mike']);
		});
		it('shows measurement values for ideas in the table cells, mapping values to the right columns', function () {
			expect(tableValues()).toEqual([
				['100',	'0'],
				['200',	'300'],
				['0',	'22']
			]);
		});
		it('value cells are updated for the changed measurement value', function () {
			measuresModel.dispatchEvent('measureValueChanged', 2, 'Profit', 33);
			expect(tableValues()).toEqual([
				['100',	'0'],
				['200',	'300'],
				['0',	'33']
			]);
		});
		it('a new column is added at the correct index when a measure is added', function () {
			measuresModel.dispatchEvent('measureAdded', 'Lucre', 1);
			expect(tableValues()).toEqual([
				['100', '0', '0'],
				['200', '0', '300'],
				['0', '0', '22']
			]);
			expect(tableColumnNames()).toEqual(['Name', 'Cost', 'Lucre', 'Profit']);
		});
		it('the column for the measure is removed when the measure is removed', function () {
			measuresModel.dispatchEvent('measureRemoved', 'Cost');
			expect(tableValues()).toEqual([
				['0'],
				['300'],
				['22']
			]);
			expect(tableColumnNames()).toEqual(['Name', 'Profit']);
		});
		it('the becomes empty when the last measure is removed', function () {
			measuresModel.dispatchEvent('measureRemoved', 'Cost');
			measuresModel.dispatchEvent('measureRemoved', 'Profit');
			expect(tableValues()).toEqual([
				[],
				[],
				[]
			]);
			expect(tableColumnNames()).toEqual(['Name']);
		});
		it('should call the model to add a new measure', function () {
			underTest.find('[data-mm-role=measure-to-add]').val('moolah');
			underTest.find('[data-mm-role=add-measure]').click();
			expect(measuresModel.addMeasure).toHaveBeenCalledWith('moolah');
		});
		describe('when reloaded', function () {
			beforeEach(function () {
				underTest.modal('hide');
				measuresModel.getMeasures = jasmine.createSpy('getMeasures').and.returnValue(['Profit', 'Fun']);
				measuresModel.getMeasurementValues = jasmine.createSpy('measurementValues').and.returnValue([
					{id: '77.session1', title: 'ron',	values: { 'Fun': 100 }},
					{id: 3,				title: 'mike2',	values: { 'Profit': 22 }}
				]);
				underTest.modal('show');
			});
			it('clears out previous measures before adding new ones', function () {
				var headerRow = underTest.find('thead tr');
				expect(_.map(headerRow.children(), function (cell) { return jQuery(cell).text(); })).toEqual(['Name', 'Profit', 'Fun']);
			});
			it('clears out previous titles before adding new ones', function () {
				var ideaNames = underTest.find('[data-mm-role=idea-title]');
				expect(_.map(ideaNames, function (cell) { return jQuery(cell).text(); })).toEqual(['ron', 'mike2']);
			});
			it('clears out previous values before adding new ones', function () {
				expect(tableValues()).toEqual([
					['0',	'100'],
					['22',	'0']
				]);

			});
		});
	});

});
