/*global jQuery */
jQuery.fn.quickEntryWidget = function (mapModel, imageInsertController) {
    'use strict';
    var self = this,
        contentsField = self.find('[data-mm-role=content]'),
        addChildButton = self.find('[data-mm-role=add-child]'),
        addSiblingButton = self.find('[data-mm-role=add-sibling]'),
        addPhotoButton = self.find('[data-mm-role=add-photo]'),
        fileSelector = self.find('[data-mm-role=file]'),
        ENTER = 13,
        TAB = 9,
        exec = function (method) {
            var text = contentsField.val();
            if (text) {
                text = text.trim();
            }
            if (text) {
               mapModel[method]('quick-entry', undefined, text);
               contentsField.val('');
            }
           contentsField.focus();
        };
    contentsField.on('keydown', function (e) {
        if (e.which === ENTER) {
            exec('addSiblingIdea');
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
        if (e.which === TAB) {
            exec('addSubIdea');
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    });
    addPhotoButton.click(function () {
        fileSelector.click();
    });
    fileSelector.on('change', function (e) {
        if (this.files && this.files.length > 0) {
            imageInsertController.insertFiles(this.files, e.originalEvent);
            fileSelector.val('');
        }
        contentsField.focus();
    });
    addChildButton.click(function () { exec('addSubIdea'); });
    addSiblingButton.click(function () { exec('addSiblingIdea'); });
    return self;
};
