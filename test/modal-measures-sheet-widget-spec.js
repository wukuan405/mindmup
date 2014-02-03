/*global describe, jasmine, beforeEach, it, jQuery, afterEach, _, expect, fakeBootstrapModal, observable*/
describe('MM.ModalMeasuresSheetWidget', function () {
	'use strict';
	var template =	'<div class="modal">' +
						'<table data-mm-role="measurements-table">' +
							'<thead><tr><th>Name</th><th data-mm-role="measurement-template"></th></tr></thead>' +
							'<tbody><tr data-mm-role="idea-template"><th data-mm-role="idea-title"></th><td data-mm-role="value-template"></td></tr></tbody>' +
						'</table>' +
					'</div>',
		underTest,
		measuresModel;
	beforeEach(function () {
		measuresModel = observable({});
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
			var headerRow = underTest.find('thead tr');
			expect(_.map(headerRow.children(), function (cell) { return jQuery(cell).text(); })).toEqual(['Name', 'Cost', 'Profit']);
		});
		it('shows active idea titles in the first column', function () {
			var ideaNames = underTest.find('[data-mm-role=idea-title]');
			expect(_.map(ideaNames, function (cell) { return jQuery(cell).text(); })).toEqual(['ron', 'tom', 'mike']);
		});
		it('shows measurement values for ideas in the table cells, mapping values to the right columns', function () {
			var result = _.map(underTest.find('tbody tr'), function (row) {
				return _.map(jQuery(row).find('td'), function (cell) {
					return jQuery(cell).text();
				});
			});
			expect(result).toEqual([
				['100',	'0'],
				['200',	'300'],
				['0',	'22']
			]);
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
				var result = _.map(underTest.find('tbody tr'), function (row) {
					return _.map(jQuery(row).find('td'), function (cell) {
						return jQuery(cell).text();
					});
				});
				expect(result).toEqual([
					['0',	'100'],
					['22',	'0']
				]);

			});
		});
	});

});
