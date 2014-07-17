/* global describe, it, beforeEach, afterEach, expect, jQuery, jasmine*/
describe('ios-modal-widget', function () {
	'use strict';
	var template = '<div id="modalWidget">' +
									'<a id="testHideButton" data-mm-role="modal-close"></a>' +
									'</div>',
			underTest;
	beforeEach(function () {
		underTest = jQuery(template).appendTo('body').iosModalWidget();
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('close button', function () {
		beforeEach(function () {
			underTest.show();
		});
		it('should hide the modal', function () {
			underTest.find('#testHideButton').click();
			expect(underTest.is(':visible')).toBeFalsy();
		});
		it('should trigger modal-will-hide event before hiding', function () {
			var listenerSpy = jasmine.createSpy('modal-will-hide'),
					listener = function () {
						expect(underTest.is(':visible')).toBeTruthy();
					};
			underTest.on(':modal-will-hide', listenerSpy).on(':modal-will-hide', listener);
			underTest.find('#testHideButton').click();
			expect(listenerSpy).toHaveBeenCalled();
		});
		it('should trigger modal-hidden event after hiding', function () {
			var listenerSpy = jasmine.createSpy('modal-hidden'),
					listener = function () {
						expect(underTest.is(':visible')).toBeFalsy();
					};
			underTest.on(':modal-hidden', listenerSpy).on(':modal-hidden', listener);
			underTest.find('#testHideButton').click();
			expect(listenerSpy).toHaveBeenCalled();
		});
	});
	describe('when modal was hidden', function () {
		beforeEach(function () {
			underTest.hide();
		});
		describe('showModal', function () {
			it('should make the modal visible', function () {
				underTest.showModal();
				expect(underTest.is(':visible')).toBeTruthy();
			});
			it('should trigger modal-will-show event before showing', function () {
				var listenerSpy = jasmine.createSpy('modal-will-show'),
						listener = function () {
							expect(underTest.is(':visible')).toBeFalsy();
						};
				underTest.on(':modal-will-show', listenerSpy).on(':modal-will-show', listener);
				underTest.showModal();
				expect(listenerSpy).toHaveBeenCalled();
			});
			it('should trigger modal-shown event after showing', function () {
				var listenerSpy = jasmine.createSpy('modal-shown'),
						listener = function () {
							expect(underTest.is(':visible')).toBeTruthy();
						};
				underTest.on(':modal-shown', listenerSpy).on(':modal-shown', listener);
				underTest.showModal();
				expect(listenerSpy).toHaveBeenCalled();
			});
		});
		describe('hideModal', function () {
			it('should not trigger modal-will-hide event', function () {
				var listenerSpy = jasmine.createSpy('modal-will-hide');
				underTest.on(':modal-will-show', listenerSpy);
				underTest.hideModal();
				expect(listenerSpy).not.toHaveBeenCalled();
			});
			it('should not trigger modal-hidden event', function () {
				var listenerSpy = jasmine.createSpy('modal-hidden');
				underTest.on(':modal-hidden', listenerSpy);
				underTest.hideModal();
				expect(listenerSpy).not.toHaveBeenCalled();
			});
			it('should leave the modal hidden', function () {
				underTest.hideModal();
				expect(underTest.is(':visible')).toBeFalsy();
			});
		});

	});
	describe('when modal is already visible', function () {
		beforeEach(function () {
			underTest.show();
		});
		describe('showModal', function () {
			it('should not trigger modal-will-show event', function () {
				var listenerSpy = jasmine.createSpy('modal-will-show');
				underTest.on(':modal-will-show', listenerSpy);
				underTest.showModal();
				expect(listenerSpy).not.toHaveBeenCalled();
			});
			it('should not trigger modal-shown event', function () {
				var listenerSpy = jasmine.createSpy('modal-shown');
				underTest.on(':modal-shown', listenerSpy);
				underTest.showModal();
				expect(listenerSpy).not.toHaveBeenCalled();
			});
			it('should leave the modal visible', function () {
				underTest.showModal();
				expect(underTest.is(':visible')).toBeTruthy();
			});
		});
		describe('hideModal', function () {
			it('should make the modal hidden', function () {
				underTest.hideModal();
				expect(underTest.is(':visible')).toBeFalsy();
			});
			it('should trigger modal-will-hide event before hiding', function () {
				var listenerSpy = jasmine.createSpy('modal-will-hide'),
						listener = function () {
							expect(underTest.is(':visible')).toBeTruthy();
						};
				underTest.on(':modal-will-hide', listenerSpy).on(':modal-will-hide', listener);
				underTest.hideModal();
				expect(listenerSpy).toHaveBeenCalled();
			});
			it('should trigger modal-hidden event after hiding', function () {
				var listenerSpy = jasmine.createSpy('modal-hidden'),
						listener = function () {
							expect(underTest.is(':visible')).toBeFalsy();
						};
				underTest.on(':modal-hidden', listenerSpy).on(':modal-hidden', listener);
				underTest.hideModal();
				expect(listenerSpy).toHaveBeenCalled();
			});
		});

	});
});