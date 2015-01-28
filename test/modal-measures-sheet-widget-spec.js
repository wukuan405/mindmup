/*global describe, jasmine, beforeEach, it, jQuery, afterEach, _, expect, observable, spyOn, MM*/
describe('measuresDisplayControlWidget', function () {
	'use strict';
	var underTest, mapModel, measuresModel, template = '<div class="dropdown-submenu" data-mm-layout="dom" data-mm-role="measures-display-control">' +
			'<ul class="dropdown-menu" role="menu">' +
			'<li><a data-category="Measurements" data-event-type="Hide" data-mm-role="hide-measure"><i class="icon-eye-close"></i>&nbsp;Hide</a></li>' +
			'<li class="divider" data-mm-role="hide-measure"></li>' +
			'<li data-mm-role="measurement-activation-template"><a data-category="Measurements" data-event-type="Show On Map" data-mm-role="show-measure"><span class="show-active"><i class="icon-check"></i>&nbsp;</span><span data-mm-role="measure-name"></span></a></li>' +
			'</ul>' +
				'</div>',
		checkMeasureNames = function (measureNames) {
			_.each(measureNames, function (measureName) {
				expect(underTest.find('[data-mm-measure="' + measureName.replace('"', '\\"') + '"]  [data-mm-role=measure-name]').text()).toBe(measureName);
			});
			expect(underTest.find('[data-mm-measure]').length).toBe(measureNames.length);
		};
	beforeEach(function () {
		mapModel = jasmine.createSpyObj('mapModel', ['setLabelGenerator']);
		measuresModel = observable(jasmine.createSpyObj('measuresModel', ['getMeasures', 'addUpMeasurementForAllNodes']));
		measuresModel.getMeasures.and.returnValue(['Cost', 'Expenses']);
		measuresModel.addUpMeasurementForAllNodes.and.returnValue({1: 3});
		underTest = jQuery(template).appendTo('body').measuresDisplayControlWidget(measuresModel, mapModel);
	});
	afterEach(function () {
		underTest.remove();
	});
	it('shows all measure in list when opened', function () {
		checkMeasureNames(['Cost', 'Expenses']);
	});
	it('adds measure to the list', function () {
		measuresModel.dispatchEvent('measureAdded', 'Fun');
		checkMeasureNames(['Cost', 'Expenses', 'Fun']);
	});
	it('removes measures from the list', function () {
		measuresModel.dispatchEvent('measureRemoved', 'Cost');
		checkMeasureNames(['Expenses']);
	});
	describe('special chars in measure names', function () {
		it('can add a measure with a space in the name', function () {
			measuresModel.dispatchEvent('measureAdded', 'Fun Run');
			checkMeasureNames(['Cost', 'Expenses', 'Fun Run']);
		});
		it('can add a measure with a quote in the name', function () {
			measuresModel.dispatchEvent('measureAdded', 'Fun"Run');
			checkMeasureNames(['Cost', 'Expenses', 'Fun"Run']);
		});
		it('can remove a measure with a space in the name', function () {
			measuresModel.dispatchEvent('measureAdded', 'Fun Run');
			measuresModel.dispatchEvent('measureRemoved', 'Fun Run');
			checkMeasureNames(['Cost', 'Expenses']);
		});
		it('can remove a measure with a quote in the name', function () {
			measuresModel.dispatchEvent('measureAdded', 'Fun"Run');
			measuresModel.dispatchEvent('measureRemoved', 'Fun"Run');
			checkMeasureNames(['Cost', 'Expenses']);
		});
	});

	it('shows a hide all option when a measure is being shown', function () {
		measuresModel.dispatchEvent('measureLabelShown', 'Cost');
		expect(underTest.find('[data-mm-role=hide-measure]').css('display')).not.toBe('none');
	});
	it('hides the hide all option when no measures are being shown', function () {
		expect(underTest.find('[data-mm-role=hide-measure]').css('display')).toBe('none');
	});
	it('sets the shown measure as active', function () {
		measuresModel.dispatchEvent('measureLabelShown', 'Cost');
		expect(underTest.find('[data-mm-measure=Cost]').hasClass('mm-active')).toBeTruthy();
		expect(underTest.find('[data-mm-measure][data-mm-measure!=Cost]').hasClass('mm-active')).toBeFalsy();
	});
	it('shows the measure when it is clicked', function () {
		var listener = jasmine.createSpy('measureLabelShownListener');
		measuresModel.addEventListener('measureLabelShown', listener);

		underTest.find('[data-mm-measure=Cost] a').click();

		expect(listener).toHaveBeenCalledWith('Cost');
		expect(mapModel.setLabelGenerator).toHaveBeenCalled();
		expect(mapModel.setLabelGenerator.calls.mostRecent().args[0]()).toEqual({1: 3});
	});
	it('rebuilds the list when told to start from scratch', function () {
		measuresModel.dispatchEvent('measureRemoved', 'Cost');

		measuresModel.dispatchEvent('startFromScratch');

		expect(underTest.find('[data-mm-measure=Cost]').length).toBe(1);
		expect(underTest.find('[data-mm-measure=Expenses]').length).toBe(1);
		expect(underTest.find('[data-mm-measure]').length).toBe(2);

	});
	it('removed the active flag from all measures if measure label shown is falsy', function () {
		measuresModel.dispatchEvent('measureShown', 'Cost');

		measuresModel.dispatchEvent('measureShown', '');

		expect(underTest.find('.mm-active').length).toBe(0);
	});
});
describe('measuresModelMediator', function () {
	'use strict';
	var mapModel, measuresModel;
	beforeEach(function () {
		mapModel = jasmine.createSpyObj('mapModel', ['selectNode', 'setInputEnabled', 'getInputEnabled']);
		measuresModel = observable({});
		MM.measuresModelMediator(mapModel, measuresModel);
		mapModel.getInputEnabled.and.returnValue(true);
	});
	it('disables input on mapModel when editing', function () {
		measuresModel.dispatchEvent('measureEditing', true, 1);
		expect(mapModel.setInputEnabled).toHaveBeenCalledWith(false, true);
	});
	it('re-enables input on mapModel when editing stops, but holds focus', function () {
		measuresModel.dispatchEvent('measureEditing', false);
		expect(mapModel.setInputEnabled).toHaveBeenCalledWith(true, true);
	});
	it('selects the node when editing in mapModel', function () {
		measuresModel.dispatchEvent('measureEditing', true, 1);
		expect(mapModel.selectNode).toHaveBeenCalledWith(1, true, true);

	});
});
describe('MM.measuresSheetWidget', function () {
	'use strict';
	var template =	'<div class="modal">' +
						'<table data-mm-role="measurements-table">' +
							'<thead>' +
							'	<tr><th>Name</th><th data-mm-role="measurement-template"><a data-mm-role="remove-measure"/><span data-mm-role="measurement-name"></span></th></tr>' +
							'</thead>' +
							'<tbody>' +
							'	<tr data-mm-role="idea-template"><th data-mm-role="idea-title" data-mm-truncate="4"></th><td data-mm-role="value-template"></td></tr>' +
							'</tbody>' +
							'<tfoot> ' +
							'	<tr><th>SUMMARY</th><th data-mm-role="summary-template" data-mm-function="add"><span data-mm-role="summary-value"></span></th></tr>' +
							'</tfoot>' +
						'</table>' +
						'<div data-mm-role="no-measures">AAA</div>' +
						'<form><input data-mm-role="measure-to-add"/><button type="submit" data-mm-role="add-measure"></button></form>' +
					'</div>',
		underTest,
		measuresModel,
		mapModel,
		tableValues = function () {
			return _.map(underTest.find('tbody tr'), function (row) {
				return _.map(jQuery(row).find('td'), function (cell) {
					return jQuery(cell).text();
				});
			});
		},
		tableColumnNames = function () {
			var headerRow = underTest.find('thead tr');
			return _.map(headerRow.children(), function (cell) {
				return jQuery(cell).text();
			});
		},
		tableFooterContent = function () {
			var headerRow = underTest.find('tfoot tr');
			return _.map(headerRow.children(), function (cell) {
				return jQuery(cell).text();
			});
		};
	beforeEach(function () {
		measuresModel = observable(jasmine.createSpyObj('measuresModel',
			['addMeasure', 'removeMeasure', 'validate', 'setValue', 'removeFilter', 'editingMeasure', 'getMeasurementForAllNodes']
		));
		spyOn(measuresModel, 'addEventListener').and.callThrough();
		mapModel = jasmine.createSpyObj('mapModel', ['setLabelGenerator']);
		underTest = jQuery(template).appendTo('body').measuresSheetWidget(measuresModel, mapModel);
		underTest.trigger('hide');

	});
	afterEach(function () {
		underTest.remove();
	});
	describe('when loaded from a map with no measures', function () {
		beforeEach(function () {
			measuresModel.getMeasures = jasmine.createSpy('getMeasures').and.returnValue([]);
			measuresModel.getMeasurementValues = jasmine.createSpy('measurementValues').and.returnValue([
				{id: '77.session1', title: 'ron'},
				{id: 1,				title: 'tom'},
				{id: 2,				title: 'mike'}
			]);
			underTest.trigger('show');
		});
		it('shows the no-measures div instead of the table', function () {
			expect(underTest.find('[data-mm-role=measurements-table]').css('display')).toEqual('none');
			expect(underTest.find('[data-mm-role=no-measures]').css('display')).toEqual('block');
		});
		it('shows the table and hides the no-measures div after the first measure is added', function () {
			measuresModel.dispatchEvent('measureAdded', 'Lucre', 0);
			expect(underTest.find('[data-mm-role=measurements-table]').css('display')).toEqual('table');
			expect(underTest.find('[data-mm-role=no-measures]').css('display')).toEqual('none');
		});
	});
	describe('listening for measureModel Events', function () {
		describe('when shown', function () {
			beforeEach(function () {
				measuresModel.getMeasures = jasmine.createSpy('getMeasures').and.returnValue([]);
				measuresModel.getMeasurementValues = jasmine.createSpy('measurementValues').and.returnValue([]);

				measuresModel.addEventListener.calls.reset();
				underTest.trigger('show');
			});
			it('subscribes to measureValueChanged, measureAdded, measureRemoved when shown', function () {
				expect(measuresModel.addEventListener.calls.count()).toBe(5);
				expect(measuresModel.addEventListener).toHaveBeenCalledWith('startFromScratch', jasmine.any(Function));
				expect(measuresModel.addEventListener).toHaveBeenCalledWith('measureRowsChanged', jasmine.any(Function));
				expect(measuresModel.addEventListener).toHaveBeenCalledWith('measureValueChanged', jasmine.any(Function));
				expect(measuresModel.addEventListener).toHaveBeenCalledWith('measureAdded', jasmine.any(Function));
				expect(measuresModel.addEventListener).toHaveBeenCalledWith('measureRemoved', jasmine.any(Function));
			});
			it('when hidden again measureValueChanged, measureAdded, measureRemoved are unsubscribed', function () {
				underTest.trigger('hide');
				expect(measuresModel.listeners('measureRowsChanged')).toEqual([]);
				expect(measuresModel.listeners('measureValueChanged')).toEqual([]);
				expect(measuresModel.listeners('measureAdded')).toEqual([]);
				expect(measuresModel.listeners('measureRemoved')).toEqual([]);
			});
		});
	});
	describe('when loaded', function () {
		beforeEach(function () {
			measuresModel.getMeasures = jasmine.createSpy('getMeasures').and.returnValue(['Cost', 'Profit']);
			measuresModel.getMeasurementValues = jasmine.createSpy('measurementValues').and.returnValue([
				{id: '77.session1', title: 'ron',	values: { 'Cost': 100 }},
				{id: 1,				title: 'tom',	values: { 'Cost': 200, 'Profit': 300 }},
				{id: 2,				title: 'mike is long',	values: { 'Profit': 22 }}
			]);
			underTest.trigger('show');
		});
		it('shows a table with measurements in the first row, keeping any non template elements', function () {
			expect(underTest.find('[data-mm-role=measurements-table]').css('display')).not.toEqual('none');
			expect(tableColumnNames()).toEqual(['Name', 'Cost', 'Profit']);
		});
		it('hides the no-measures div', function () {
			expect(underTest.find('[data-mm-role=no-measures]').css('display')).toEqual('none');
		});
		it('creates summary cells in the footer, keeping any non template elements', function () {
			expect(tableFooterContent()).toEqual(['SUMMARY', '300', '322']);
		});
		it('shows active idea titles in the first column, truncating if needed', function () {
			var ideaNames = underTest.find('[data-mm-role=idea-title]');
			expect(_.map(ideaNames, function (cell) {
				return jQuery(cell).text();
			})).toEqual(['ron', 'tom', 'mike...']);
		});
		describe('measureLabelShown event handling', function () {
			it('if a label is shown assigns the active class to the label', function () {
				measuresModel.dispatchEvent('measureLabelShown', 'Cost');
				expect(underTest.find('.mm-active [data-mm-role=measurement-name]').text()).toBe('Cost');
			});
			it('removes  mm-active class from all labels when no label is shown', function () {
				measuresModel.dispatchEvent('measureLabelShown', 'Cost');
				measuresModel.dispatchEvent('measureLabelShown', false);
				expect(underTest.find('.mm-active').length).toBe(0);
			});
			it('removes mm-active class from previously active when the shown label changes', function () {
				measuresModel.dispatchEvent('measureLabelShown', 'Cost');
				measuresModel.dispatchEvent('measureLabelShown', 'Profit');
				expect(underTest.find('.mm-active [data-mm-role=measurement-name]').text()).toBe('Profit');
			});
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
			expect(tableColumnNames()).toEqual(['Name', 'Cost', 'Profit']);
			expect(tableValues()).toEqual([
				['100',	'0'],
				['200',	'300'],
				['0',	'33']
			]);
			expect(tableFooterContent()).toEqual(['SUMMARY', '300', '333']);
		});
		it('value cells are untouched if the measurement is not displayed', function () {
			measuresModel.dispatchEvent('measureValueChanged', 2, 'XProfit', 33);
			expect(tableColumnNames()).toEqual(['Name', 'Cost', 'Profit']);
			expect(tableValues()).toEqual([
				['100',	'0'],
				['200',	'300'],
				['0',	'22']
			]);
			expect(tableFooterContent()).toEqual(['SUMMARY', '300', '322']);
		});
		it('a new column is added at the correct index when a measure is added', function () {
			measuresModel.dispatchEvent('measureAdded', 'Lucre', 1);
			expect(tableValues()).toEqual([
				['100', '0', '0'],
				['200', '0', '300'],
				['0', '0', '22']
			]);
			expect(tableColumnNames()).toEqual(['Name', 'Cost', 'Lucre', 'Profit']);
			expect(tableFooterContent()).toEqual(['SUMMARY', '300', '0', '322']);
		});
		it('the column for the measure is removed when the measure is removed', function () {
			measuresModel.dispatchEvent('measureRemoved', 'Cost');
			expect(tableValues()).toEqual([
				['0'],
				['300'],
				['22']
			]);
			expect(tableColumnNames()).toEqual(['Name', 'Profit']);
			expect(tableFooterContent()).toEqual(['SUMMARY', '322']);
		});
		it('the becomes empty when the last measure is removed', function () {
			measuresModel.dispatchEvent('measureRemoved', 'Cost');
			measuresModel.dispatchEvent('measureRemoved', 'Profit');
			measuresModel.dispatchEvent('measureRemoved', 'Another');
			expect(tableValues()).toEqual([
				[],
				[],
				[]
			]);
			expect(tableColumnNames()).toEqual(['Name']);
			expect(tableFooterContent()).toEqual(['SUMMARY']);
		});
		describe('adding a new measure', function () {
			it('should call the model to add a new measure', function () {
				underTest.find('[data-mm-role=measure-to-add]').val('moolah');
				underTest.find('[data-mm-role=add-measure]').click();
				expect(measuresModel.addMeasure).toHaveBeenCalledWith('moolah');
			});
			it('should clear the input field', function () {
				underTest.find('[data-mm-role=measure-to-add]').val('moolah');
				underTest.find('[data-mm-role=add-measure]').click();
				expect(underTest.find('[data-mm-role=measure-to-add]').val()).toBeFalsy();
			});
		});
		describe('removing measures', function () {
			it('should call the model to remove the measure', function () {
				underTest.find('[data-mm-role=remove-measure]').first().click();
				expect(measuresModel.removeMeasure).toHaveBeenCalledWith('Cost');
			});
		});
		describe('when reloaded', function () {
			beforeEach(function () {
				underTest.trigger('hide');
				measuresModel.getMeasures = jasmine.createSpy('getMeasures').and.returnValue(['Profit', 'Fun']);
				measuresModel.getMeasurementValues = jasmine.createSpy('measurementValues').and.returnValue([
					{id: '77.session1', title: 'ron',	values: { 'Fun': 100 }},
					{id: 3,				title: 'non',	values: { 'Profit': 22 }}
				]);
				underTest.trigger('show');
			});
			it('clears out previous measures before adding new ones', function () {
				var headerRow = underTest.find('thead tr');
				expect(_.map(headerRow.children(), function (cell) {
					return jQuery(cell).text();
				})).toEqual(['Name', 'Profit', 'Fun']);
				expect(tableFooterContent()).toEqual(['SUMMARY', '22', '100']);
			});
			it('clears out previous titles before adding new ones', function () {
				var ideaNames = underTest.find('[data-mm-role=idea-title]');
				expect(_.map(ideaNames, function (cell) {
					return jQuery(cell).text();
				})).toEqual(['ron', 'non']);
			});
			it('clears out previous values before adding new ones', function () {
				expect(tableValues()).toEqual([
					['0',	'100'],
					['22',	'0']
				]);

			});
		});
		describe('measure value validation', function () {
			var active;
			beforeEach(function () {
				active = underTest.find('tbody tr td').first();
			});

			it('asks the model to validate changed measure values, sets the event result to validation result', function () {
				var evt = jQuery.Event('validate');
				measuresModel.validate.and.returnValue('mike');

				active.text('text').trigger(evt, 'text');

				expect(measuresModel.validate).toHaveBeenCalledWith('text');
				expect(evt.result).toBe('mike');
			});
			it('asks the model to changed measure value, passing the element id and ', function () {
				var evt = jQuery.Event('change');
				measuresModel.setValue.and.returnValue('mike');

				active.text('text').trigger(evt, 'text');

				expect(measuresModel.setValue).toHaveBeenCalledWith('77.session1', 'Cost', 'text');
				expect(evt.result).toBe('mike');
			});
			it('asks the model to added and changedmeasure value, passing the element id and ', function () {
				measuresModel.dispatchEvent('measureAdded', 'Hello', 2);
				active = underTest.find('tbody tr td').last();
				var evt = jQuery.Event('change');
				measuresModel.setValue.and.returnValue('mike');

				active.text('text').trigger(evt, 'text');

				expect(measuresModel.setValue).toHaveBeenCalledWith(2, 'Hello', 'text');
				expect(evt.result).toBe('mike');

			});
		});
	});

});
