/*global beforeEach, describe, expect, it, MM, $, spyOn, jasmine*/
describe('MM.navigation', function () {
	'use strict';
	var underTest;
	beforeEach(function () {
		underTest = new MM.navigation({mapId: 'mapIdInConfig'});
	});
	describe('currentMapId', function () {
		it('should return mapId from window address hash', function () {
			window.location.hash = 'm:mapIdInHash';
			expect(underTest.currentMapId()).toBe('mapIdInHash');
		});
		it('should return mapId from config if there is no window address hash', function () {
			window.location.hash = '';
			expect(underTest.currentMapId()).toBe('mapIdInConfig');
		});
		it('should ignore window address hash if it does not match format', function () {
			window.location.hash = 'mapIdInHash';
			expect(underTest.currentMapId()).toBe('mapIdInConfig');
		});
		it('should return default as fallback', function () {
			window.location.hash = '';
			underTest = new MM.navigation({});
			expect(underTest.currentMapId()).toBe('default');
		});

	});
	describe('wireLinkForMapId', function () {
		var link;
		beforeEach(function () {
			link = $('<a>');
		});
		it('should return link', function () {
			underTest.wireLinkForMapId('newMapId', link);
		});
		describe('when mapId is from window address hash', function () {
			beforeEach(function () {
				window.location.hash = 'm:mapIdInHash';
			});
			it('should set # as href', function () {
				underTest.wireLinkForMapId('newMapId', link);
				expect(link.attr('href')).toBe('#m:newMapId');
			});
			it('should set click event', function () {
				spyOn(link, 'click').andCallThrough();
				underTest.wireLinkForMapId('newMapId', link);
				expect(link.click).toHaveBeenCalledWith(jasmine.any(Function));
			});
			it('should set the link to call changeMapId when it is clicked', function () {
				underTest = new MM.navigation({mapId: 'mapIdInConfig'});
				spyOn(underTest, 'changeMapId');
				underTest.wireLinkForMapId('newMapId', link);
				link.click();
				expect(underTest.changeMapId).toHaveBeenCalledWith('newMapId');
			});
		});
		describe('when there is no window address hash', function () {
			beforeEach(function () {
				window.location.hash = '';
			});
			it('should set /map/newMapId as href', function () {
				underTest.wireLinkForMapId('newMapId', link);
				expect(link.attr('href')).toBe('/map/newMapId');
			});
			it('should not set click event', function () {
				spyOn(link, 'click').andCallThrough();
				underTest.wireLinkForMapId('newMapId', link);
				expect(link.click).not.toHaveBeenCalled();
			});
		});
	});
	describe('changeMapId', function () {
		describe('when mapId is from window address hash', function () {
			var listener;
			beforeEach(function () {
				window.location.hash = 'm:mapIdInHash';
				underTest = new MM.navigation({mapId: 'mapIdInConfig'});
				listener = jasmine.createSpy();
				underTest.addEventListener('mapIdChanged', listener);
			});
			it('should return true when mapId is not the same', function () {
				expect(underTest.changeMapId('newMapId')).toBe(true);
			});
			it('should set window address hash to new mapId', function () {
				underTest.changeMapId('newMapId');
				expect(window.location.hash).toBe('#m:newMapId');
			});
			it('should notify listeners of newMapId', function () {
				underTest.changeMapId('newMapId');
				expect(listener).toHaveBeenCalledWith('newMapId', 'mapIdInHash');
			});
			it('should return false when mapId is the same', function () {
				expect(underTest.changeMapId('mapIdInHash')).toBe(false);
				expect(window.location.hash).toBe('#m:mapIdInHash');
				expect(listener).not.toHaveBeenCalled();
			});
		});
		describe('when there is no window address hash', function () {
			beforeEach(function () {
				window.location.hash = '';
				underTest = new MM.navigation({mapId: 'mapIdInConfig'});
			});
			it('should return false when mapId is the same', function () {
				expect(underTest.changeMapId('mapIdInConfig')).toBe(false);
				expect(window.location.hash).toBe('');
			});
		});
	});
});