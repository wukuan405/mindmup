/* global describe, it, beforeEach, afterEach, expect, jQuery, jasmine, _*/
describe('goldStorageOpenWidget', function () {
	'use strict';
	var underTest, goldMapStorageAdapter, mapController,
			template =  '<div>' +
									'<div data-mm-section="file-list">' +
									'<table><tbody>' +
										'<tr data-mm-role="template">' +
											'<td><a href="#" data-mm-role="file-link"></a></td>' +
											'<td data-mm-role="modification-status"></td>' +
											'<td>' +
												'<button data-mm-role="map-delete"></button>' +
											'</td>' +
										'</tr>' +
									'</tbody></table>' +
									'</div>' +
									'<div data-mm-section="delete-map"><span data-mm-role="map-name"></span></div>' +
									'<div data-mm-section="delete-map-in-progress"></div>' +
									'<div data-mm-section="delete-map-successful"></div>' +
									'<div data-mm-section="delete-map-failed"></div>' +
									'<button data-mm-role="delete-map-confirmed"></button>' +
									'</div>',
		checkSectionShown = function (sectionName) {
			var visibleSections = [];
			_.each(underTest.find('[data-mm-section]'), function (sectionDom) {
				var section = jQuery(sectionDom);
				if (section.css('display') !== 'none') {
					visibleSections.push(section.data('mm-section'));
				}
			});
			expect(visibleSections).toEqual([sectionName]);
		};


	beforeEach(function () {
		goldMapStorageAdapter = jasmine.createSpyObj('goldMapStorageAdapter', ['list', 'deleteMap']);
		goldMapStorageAdapter.list.and.callFake(function () {
			return jQuery.Deferred().resolve([{
				id: 'mapid',
				title: 'test map.mup',
				modifiedDate: 1
			}]).promise();
		});
		mapController = jasmine.createSpyObj('mapController', ['loadMap']);

		underTest = jQuery(template).appendTo('body').goldStorageOpenWidget(goldMapStorageAdapter, mapController);
		underTest.trigger('show');
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('when shown', function () {
		it('shows the file list section', function () {
			underTest.trigger('show');
			checkSectionShown('file-list');
		});
	});
	describe('map deletion', function () {
		var deleteButton;
		beforeEach(function () {
			underTest.trigger('show');
			deleteButton = underTest.find('[data-mm-role="map-delete"]').first();
		});
		it('should show the delete-map section', function () {
			deleteButton.click();
			checkSectionShown('delete-map');
		});
		it('should populate the map name', function () {
			deleteButton.click();
			expect(underTest.find('[data-mm-role="map-name"]').text()).toEqual('test map.mup');
		});
		describe('once the deletion is confirmed', function () {
			var deleteConfirmedButton, deferred;
			beforeEach(function () {
				deferred = jQuery.Deferred();
				goldMapStorageAdapter.deleteMap.and.callFake(function () {
					return deferred.promise();
				});
				deleteButton.click();
				deleteConfirmedButton = underTest.find('[data-mm-role=delete-map-confirmed]');
			});
			it('shows the deletion in progess section', function () {
				deleteConfirmedButton.click();
				checkSectionShown('delete-map-in-progress');
			});
			it('uses the goldMapStorageAdapter to delete the map', function () {
				deleteConfirmedButton.click();
				expect(goldMapStorageAdapter.deleteMap).toHaveBeenCalledWith('test map.mup');
			});
			it('shows the delete-map-successful section if deletion is completed', function () {
				deleteConfirmedButton.click();
				deferred.resolve('done');
				checkSectionShown('delete-map-successful');
			});
			it('shows the delete-map-failed section if map deletion fails', function () {
				deleteConfirmedButton.click();
				deferred.reject('no-good');
				checkSectionShown('delete-map-failed');
			});
		});
	});
});
