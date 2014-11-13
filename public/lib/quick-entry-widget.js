/*global jQuery */
jQuery.fn.quickEntryWidget = function (mapModel) {
    'use strict';
    var self = this,
        contentsField = self.find('[data-mm-role=content]'),
        addChildButton = self.find('[data-mm-role=add-child]'),
        addSiblingButton = self.find('[data-mm-role=add-sibling]'),
        addPhotoButton = self.find('[data-mm-role=add-photo]'),
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
    contentsField.on('keypress', function (e) {
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
    addChildButton.click(function () { exec('addSubIdea'); });
    addSiblingButton.click(function () { exec('addSiblingIdea'); });
    return self;
};
