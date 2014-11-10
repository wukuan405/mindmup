/*global describe, expect, it, beforeEach, spyOn, jQuery, afterEach, jasmine, observable, MM, sinon*/
describe('Google URL Shortener', function () {
    'use strict';
    var googleKey, activityLog, mapController, baseUrl, underTest, ajaxCall, listener, clock;

    beforeEach(function () {
        googleKey = 'GOOGLE-KEY';
        activityLog = jasmine.createSpyObj('activityLog', ['log']);
        mapController = observable({});
        baseUrl = 'https://example.com/map/';
        spyOn(jQuery, 'ajax').and.callFake(function () {
            ajaxCall = jQuery.Deferred();
            return ajaxCall.promise();
        });
        underTest = new MM.GoogleUrlShortenerController(googleKey, activityLog, mapController, baseUrl);
        listener = jasmine.createSpy('listener');
        underTest.addEventListener('urlChanged', listener);
        clock = sinon.useFakeTimers();
    });
    afterEach(function () {
        clock.restore();
    });
    describe('fires the shortener when the mapController initially dispatches', [
            ['on saving', 'mapSaved'],
            ['on loading', 'mapLoaded']
        ], function (eventName) {
            mapController.dispatchEvent(eventName, 'INITIAL_MAP_ID');
            expect(jQuery.ajax).toHaveBeenCalled();
            var callArgs = jQuery.ajax.calls.mostRecent().args;
            expect(callArgs[0].type).toBe('post');
            expect(callArgs[0].data).toBe('{"longUrl": "https://example.com/map/INITIAL_MAP_ID"}');
            expect(callArgs[0].url).toBe('https://www.googleapis.com/urlshortener/v1/url?key=GOOGLE-KEY');
    });
    it('fires a URL changed event immediately after the map controller dispatches', function () {
        mapController.dispatchEvent('mapLoaded', 'INITIAL_MAP_ID');
        expect(listener).toHaveBeenCalledWith('https://example.com/map/INITIAL_MAP_ID');
    });
    it('does not fires the shortener again if the map ID does not change', function () {
        mapController.dispatchEvent('mapLoaded', 'INITIAL_MAP_ID');
        jQuery.ajax.calls.reset();
        mapController.dispatchEvent('mapSaved', 'INITIAL_MAP_ID');
        expect(jQuery.ajax).not.toHaveBeenCalled();
    });
    it('fires the shortener again if the map ID changes', function () {
        mapController.dispatchEvent('mapLoaded', 'INITIAL_MAP_ID');
        jQuery.ajax.calls.reset();
        mapController.dispatchEvent('mapSaved', 'NEW_MAP_ID');
        expect(jQuery.ajax).toHaveBeenCalled();
        var callArgs = jQuery.ajax.calls.mostRecent().args;
        expect(callArgs[0].type).toBe('post');
        expect(callArgs[0].data).toBe('{"longUrl": "https://example.com/map/NEW_MAP_ID"}');
        expect(callArgs[0].url).toBe('https://www.googleapis.com/urlshortener/v1/url?key=GOOGLE-KEY');
    });
    it('dispatches a urlChanged event when the ajax call resolves', function () {
        mapController.dispatchEvent('mapLoaded', 'INITIAL_MAP_ID');
        ajaxCall.resolve({id: 'short.url.id'});
        expect(listener).toHaveBeenCalledWith('short.url.id');
    });
    describe('after failure', function () {
        beforeEach(function () {
            mapController.dispatchEvent('mapLoaded', 'INITIAL_MAP_ID');
            listener.calls.reset();
            ajaxCall.reject({}, 404, 'not found');
        });
        it('does not resolve listeners', function () {
            expect(listener).not.toHaveBeenCalled();
        });
        it('does not re-trigger ajax immediately', function () {
            expect(jQuery.ajax.calls.count()).toBe(1);
        });
        it('does not log a warning', function () {
            expect(activityLog.log).not.toHaveBeenCalled();
        });
        it('retries the call after one second', function () {
            jQuery.ajax.calls.reset();
            clock.tick(1001);
            expect(jQuery.ajax).toHaveBeenCalled();
            var callArgs = jQuery.ajax.calls.mostRecent().args;
            expect(callArgs[0].type).toBe('post');
            expect(callArgs[0].data).toBe('{"longUrl": "https://example.com/map/INITIAL_MAP_ID"}');
            expect(callArgs[0].url).toBe('https://www.googleapis.com/urlshortener/v1/url?key=GOOGLE-KEY');
        });
        it('retries up to 5 times', function () {
            var i;
            for (i = 0; i < 4; i++) {
                clock.tick(1001);
                ajaxCall.reject({}, 404, 'not found');
            }
            jQuery.ajax.calls.reset();
            clock.tick(1001);
            expect(jQuery.ajax).toHaveBeenCalled();
            var callArgs = jQuery.ajax.calls.mostRecent().args;
            expect(callArgs[0].type).toBe('post');
            expect(callArgs[0].data).toBe('{"longUrl": "https://example.com/map/INITIAL_MAP_ID"}');
            expect(callArgs[0].url).toBe('https://www.googleapis.com/urlshortener/v1/url?key=GOOGLE-KEY');
        });
        describe('when no more retries left', function () {
            beforeEach(function () {
                var i;
                for (i = 0; i < 5; i++) {
                    clock.tick(1001);
                    ajaxCall.reject({}, 404, 'not found');
                }
            });
            it('does not send any more calls to ajax', function () {
                jQuery.ajax.calls.reset();
                clock.tick(1001);
                expect(jQuery.ajax).not.toHaveBeenCalled();
            });
            it('logs a warning to activityLog', function () {
                expect(activityLog.log).toHaveBeenCalledWith('Warning', 'URL shortener failed', '404 not found');
            });
            it('does not resolve the listener', function () {
                expect(listener).not.toHaveBeenCalled();
            });
        });
    });

});
describe('Url Shortener Widget', function () {
    'use strict';
    var template = '<input type="text" value="XXX1"/><div role="share-div"></div>',
        underTest,
        shortenerController;
    beforeEach(function () {
        shortenerController = observable({});
        underTest = jQuery(template).appendTo('body').urlShortenerWidget(shortenerController);
    });
    it('hides element by default', function () {
        expect(underTest.css('display')).toBe('none');
    });
    describe('input handler', function () {
        var input, dom;
        beforeEach(function () {
            input = underTest.filter('input');
            dom = underTest[0];
        });
        it('should reset mm-url value on input', function () {
            input.data('mm-url', 'old value').val('new value');
            input.trigger('input');
            expect(input.val()).toBe('old value');
        });
        it('should select all on click', function () {
            input.val('some long value').show();
            dom.selectionEnd = 5;
            dom.selectionStart = 3;
            input.trigger('click');
            expect(dom.selectionEnd).toBe('some long value'.length);
            expect(dom.selectionStart).toBe(0);
        });
    });
    it('should not blow up when using a DIV (regression check)', function () {
        underTest.filter('div').trigger('click');
    });
    describe('shortener control integration', function () {
        it('should set the mm-url and value when the urlChanged event is triggered', function () {
            underTest.data('mm-url', 'old value').val('old value');
            shortenerController.dispatchEvent('urlChanged', 'http://xyz');
            expect(underTest.filter('input').data('mm-url')).toBe('http://xyz');
            expect(underTest.filter('div').data('mm-url')).toBe('http://xyz');
            expect(underTest.filter('input').val()).toBe('http://xyz');
        });
        it('shows the element when the URL changed is not blank', function () {
            shortenerController.dispatchEvent('urlChanged', 'non blank');
            expect(underTest.filter('input').css('display')).not.toBe('none');
            expect(underTest.filter('div').css('display')).not.toBe('none');
        });
        it('hides the element when the URL changed is blank', function () {
            shortenerController.dispatchEvent('urlChanged', '');
            expect(underTest.filter('input').css('display')).toBe('none');
            expect(underTest.filter('div').css('display')).toBe('none');
        });
    });
    afterEach(function () {
        underTest.remove();
    });
});
