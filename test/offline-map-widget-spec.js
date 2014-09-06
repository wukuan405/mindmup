/*global beforeEach, fakeBootstrapModal, describe, it, jQuery, observable, expect, afterEach, _*/
describe('offline map widget', function () {
    'use strict';
	var template = '<div class="modal"></div>',
        mapController,
        underTest;
	beforeEach(function () {
        mapController = observable({});
		underTest = jQuery(template).appendTo('body').offlineMapWidget(mapController);
		fakeBootstrapModal(underTest);
	});
    it('automatically shows modal when an offline map loading fails', function () {
        mapController.dispatchEvent('mapIdNotRecognised', 'o12345');
        expect(underTest.modal).toHaveBeenCalledWith('show');
    });
    it('ignores other map loading failures', function () {
        _.each(['g','a','h','p','b'], function (prefix) {
            mapController.dispatchEvent('mapIdNotRecognised', prefix+'12345');
            expect(underTest.modal).not.toHaveBeenCalledWith('show');
        });
    });
	afterEach(function () {
		underTest.remove();
	});
});
