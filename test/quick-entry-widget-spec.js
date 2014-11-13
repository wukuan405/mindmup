/*global describe, it, expect, jQuery, beforeEach, afterEach, jasmine, it */
describe('Quick Entry Widget', function () {
	'use strict';
    var mapModel,
        underTest,
        contentsField, addChildButton, addSiblingButton, addPhotoButton,
        template = '<div><input type="text" data-mm-role="content"/><button data-mm-role="add-sibling"></button><button data-mm-role="add-child"></button><button data-mm-role="add-photo"></button></div>';
    beforeEach(function () {
        mapModel = jasmine.createSpyObj('mapModel', ['addSubIdea', 'addSiblingIdea']);
        underTest = jQuery(template).appendTo('body').quickEntryWidget(mapModel);
        contentsField = underTest.find('[data-mm-role=content]');
        addChildButton = underTest.find('[data-mm-role=add-child]');
        addSiblingButton = underTest.find('[data-mm-role=add-sibling]');
        addPhotoButton = underTest.find('[data-mm-role=add-photo]');
        contentsField.val('initial text');
        contentsField.focus();
    });
    it('creates a new sibling with the text from the content box on enter', function () {
        contentsField.trigger(jQuery.Event('keypress', {which: 13}));
        expect(mapModel.addSiblingIdea).toHaveBeenCalledWith('quick-entry', undefined, 'initial text');
        expect(contentsField.val()).toEqual('');
        expect(contentsField.is(':focus'));
    });
    it('creates a new sibling with the text from the content box on click of add-sibling', function () {
        addSiblingButton.focus().trigger('click');
        expect(mapModel.addSiblingIdea).toHaveBeenCalledWith('quick-entry', undefined, 'initial text');
        expect(contentsField.val()).toEqual('');
        expect(contentsField.is(':focus'));
    });
    it('creates a new sub-idea with the text from the content box on add-child', function () {
        addChildButton.focus().trigger('click');
        expect(mapModel.addSubIdea).toHaveBeenCalledWith('quick-entry', undefined, 'initial text');
        expect(contentsField.val()).toEqual('');
        expect(contentsField.is(':focus'));
    });
    it('creates a new sub-idea with the text from the content box on tab', function () {
        contentsField.trigger(jQuery.Event('keypress', {which: 9}));
        expect(mapModel.addSubIdea).toHaveBeenCalledWith('quick-entry', undefined, 'initial text');
        expect(contentsField.val()).toEqual('');
        expect(contentsField.is(':focus'));
    });
    it('does not create siblings or children until there is text in the box', function () {
        contentsField.val('');
        contentsField.trigger(jQuery.Event('keypress', {which: 9}));
        contentsField.trigger(jQuery.Event('keypress', {which: 13}));
        addChildButton.trigger('click');
        addSiblingButton.trigger('click');
        expect(mapModel.addSubIdea).not.toHaveBeenCalled();
        expect(mapModel.addSiblingIdea).not.toHaveBeenCalled();
        expect(contentsField.is(':focus'));
    });
    it('does not create siblings or children on empty text', function () {
        contentsField.val('   ');
        contentsField.trigger(jQuery.Event('keypress', {which: 9}));
        contentsField.trigger(jQuery.Event('keypress', {which: 13}));
        addChildButton.trigger('click');
        addSiblingButton.trigger('click');
        expect(mapModel.addSubIdea).not.toHaveBeenCalled();
        expect(mapModel.addSiblingIdea).not.toHaveBeenCalled();
        expect(contentsField.is(':focus'));
        expect(contentsField.val()).toBe('   ');
    });
    afterEach(function () {
        underTest.remove();
    });
});
