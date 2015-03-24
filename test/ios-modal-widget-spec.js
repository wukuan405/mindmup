/* global describe, it, beforeEach, afterEach, expect, jQuery, jasmine*/
describe('ios-modal-widget', function () {
	'use strict';
	var template = '<div id="modalWidget">' +
									'<a id="testHideButton" data-mm-role="dismiss-modal"></a>' +
									'</div>',
			underTest,
			mmProxy;
	beforeEach(function () {
		mmProxy = jasmine.createSpyObj('mmProxy', ['sendMessage']);
		underTest = jQuery(template).appendTo('body').iosModalWidget(mmProxy);
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
		it('should trigger hide event before hiding', function () {
			var listenerSpy = jasmine.createSpy('hide'),
					listener = function () {
						expect(underTest.is(':visible')).toBeTruthy();
					};
			underTest.on('hide', listenerSpy).on('hide', listener);
			underTest.find('#testHideButton').click();
			expect(listenerSpy).toHaveBeenCalled();
		});
		it('should trigger hidden event after hiding', function () {
			var listenerSpy = jasmine.createSpy('hidden'),
					listener = function () {
						expect(underTest.is(':visible')).toBeFalsy();
					};
			underTest.on('hidden', listenerSpy).on('hidden', listener);
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
			it('should trigger show event before showing', function () {
				var listenerSpy = jasmine.createSpy('show'),
						listener = function () {
							expect(underTest.is(':visible')).toBeFalsy();
						};
				underTest.on('show', listenerSpy).on('show', listener);
				underTest.showModal();
				expect(listenerSpy).toHaveBeenCalled();
			});
			it('should trigger shown event after showing', function () {
				var listenerSpy = jasmine.createSpy('shown'),
						listener = function () {
							expect(underTest.is(':visible')).toBeTruthy();
						};
				underTest.on('shown', listenerSpy).on('shown', listener);
				underTest.showModal();
				expect(listenerSpy).toHaveBeenCalled();
			});
			it('should send modal shown event to proxy', function () {
				underTest.showModal();
				expect(mmProxy.sendMessage).toHaveBeenCalledWith({type:'modal', args:['shown']});
			});
		});
		describe('hideModal', function () {
			it('should not trigger hide event', function () {
				var listenerSpy = jasmine.createSpy('hide');
				underTest.on('show', listenerSpy);
				underTest.hideModal();
				expect(listenerSpy).not.toHaveBeenCalled();
			});
			it('should not trigger hidden event', function () {
				var listenerSpy = jasmine.createSpy('hidden');
				underTest.on('hidden', listenerSpy);
				underTest.hideModal();
				expect(listenerSpy).not.toHaveBeenCalled();
			});
			it('should leave the modal hidden', function () {
				underTest.hideModal();
				expect(underTest.is(':visible')).toBeFalsy();
			});
			it('should not send modal event to proxy', function () {
				underTest.hideModal();
				expect(mmProxy.sendMessage).not.toHaveBeenCalled();
			});

		});

	});
	describe('when modal is already visible', function () {
		beforeEach(function () {
			underTest.show();
		});
		describe('showModal', function () {
			it('should not trigger show event', function () {
				var listenerSpy = jasmine.createSpy('show');
				underTest.on('show', listenerSpy);
				underTest.showModal();
				expect(listenerSpy).not.toHaveBeenCalled();
			});
			it('should not trigger shown event', function () {
				var listenerSpy = jasmine.createSpy('shown');
				underTest.on('shown', listenerSpy);
				underTest.showModal();
				expect(listenerSpy).not.toHaveBeenCalled();
			});
			it('should leave the modal visible', function () {
				underTest.showModal();
				expect(underTest.is(':visible')).toBeTruthy();
			});
			it('should not send modal event to proxy', function () {
				underTest.showModal();
				expect(mmProxy.sendMessage).not.toHaveBeenCalled();
			});

		});
		describe('hideModal', function () {
			it('should make the modal hidden', function () {
				underTest.hideModal();
				expect(underTest.is(':visible')).toBeFalsy();
			});
			it('should trigger hide event before hiding', function () {
				var listenerSpy = jasmine.createSpy('hide'),
						listener = function () {
							expect(underTest.is(':visible')).toBeTruthy();
						};
				underTest.on('hide', listenerSpy).on('hide', listener);
				underTest.hideModal();
				expect(listenerSpy).toHaveBeenCalled();
			});
			it('should trigger hidden event after hiding', function () {
				var listenerSpy = jasmine.createSpy('hidden'),
						listener = function () {
							expect(underTest.is(':visible')).toBeFalsy();
						};
				underTest.on('hidden', listenerSpy).on('hidden', listener);
				underTest.hideModal();
				expect(listenerSpy).toHaveBeenCalled();
			});
			it('should send modal hidden event to proxy', function () {
				underTest.hideModal();
				expect(mmProxy.sendMessage).toHaveBeenCalledWith({type:'modal', args:['hidden']});
			});
		});
		describe('stateChanged event handling', function () {
			it('should pass event to mmProxy', function () {
				underTest.trigger(jQuery.Event('stateChanged', {'state': 'test-state'}));
				expect(mmProxy.sendMessage).toHaveBeenCalledWith({ type : 'modal', args : ['stateChanged', 'test-state'] });
			});
		});
	});
});
