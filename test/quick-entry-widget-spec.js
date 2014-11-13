/*global describe, it, expect, jQuery, beforeEach, afterEach, jasmine, it */
describe('Quick Entry Widget', function () {
	'use strict';
    var mapModel, imageInsertController,
        underTest,
        contentsField, addChildButton, addSiblingButton, addPhotoButton, fileButton,
        template = '<div><input type="text" data-mm-role="content"/><button data-mm-role="add-sibling"></button><button data-mm-role="add-child"></button><button data-mm-role="add-photo"></button><input type="text" data-mm-role="file" /></div>';
    beforeEach(function () {
        mapModel = jasmine.createSpyObj('mapModel', ['addSubIdea', 'addSiblingIdea']);
        imageInsertController = jasmine.createSpyObj('imageInsertController', ['insertFiles']);
        underTest = jQuery(template).appendTo('body').quickEntryWidget(mapModel, imageInsertController);
        contentsField = underTest.find('[data-mm-role=content]');
        addChildButton = underTest.find('[data-mm-role=add-child]');
        addSiblingButton = underTest.find('[data-mm-role=add-sibling]');
        addPhotoButton = underTest.find('[data-mm-role=add-photo]');
        fileButton = underTest.find('[data-mm-role=file]');
        contentsField.val('initial text');
        contentsField.focus();
    });
    it('creates a new sibling with the text from the content box on enter', function () {
        contentsField.trigger(jQuery.Event('keydown', {which: 13}));
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
        contentsField.trigger(jQuery.Event('keydown', {which: 9}));
        expect(mapModel.addSubIdea).toHaveBeenCalledWith('quick-entry', undefined, 'initial text');
        expect(contentsField.val()).toEqual('');
        expect(contentsField.is(':focus'));
    });
    it('does not create siblings or children until there is text in the box', function () {
        contentsField.val('');
        contentsField.trigger(jQuery.Event('keydown', {which: 9}));
        contentsField.trigger(jQuery.Event('keydown', {which: 13}));
        addChildButton.trigger('click');
        addSiblingButton.trigger('click');
        expect(mapModel.addSubIdea).not.toHaveBeenCalled();
        expect(mapModel.addSiblingIdea).not.toHaveBeenCalled();
        expect(contentsField.is(':focus'));
    });
    it('does not create siblings or children on empty text', function () {
        contentsField.val('   ');
        contentsField.trigger(jQuery.Event('keydown', {which: 9}));
        contentsField.trigger(jQuery.Event('keydown', {which: 13}));
        addChildButton.trigger('click');
        addSiblingButton.trigger('click');
        expect(mapModel.addSubIdea).not.toHaveBeenCalled();
        expect(mapModel.addSiblingIdea).not.toHaveBeenCalled();
        expect(contentsField.is(':focus'));
        expect(contentsField.val()).toBe('   ');
    });
    it('opens the file selector when clicking on the photo button', function () {
        var fileButtonClick=jasmine.createSpy('fileButtonClick');
        fileButton.click(fileButtonClick);
        addPhotoButton.click();
        expect(fileButtonClick).toHaveBeenCalled();
    });
    it('inserts files using the image insert controller when file field changes', function () {
        var evt = jQuery.Event('change', {target: {files: 'SOME FILES'}, originalEvent: 'ORIG EVENT'});
        fileButton.trigger(evt);
        expect(imageInsertController.insertFiles).toHaveBeenCalledWith('SOME FILES', 'ORIG EVENT');
    });
    afterEach(function () {
        underTest.remove();
    });
});
