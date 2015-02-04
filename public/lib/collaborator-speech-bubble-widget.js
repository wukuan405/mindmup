/*global jQuery, setTimeout, _ */
jQuery.fn.collaboratorSpeechBubbleWidget = function (collaborationModel) {
	'use strict';
	var timeout = 3000;
	return this.each(function () {
		var element = jQuery(this),
			currentCollaborator,
			showCollaborator = function () {
				collaborationModel.showCollaborator(currentCollaborator);
			},
			img = element.find('[data-mm-role=collaborator-photo]'),
			contentTemplate = element.find('[data-mm-role=popover-content-template]').detach(),
			titleTemplate = element.find('[data-mm-role=popover-title-template]').detach(),
			popoverContent = function (nodeTitle) {
				contentTemplate.find('[data-mm-role=popover-content]').text(nodeTitle);
				return contentTemplate.html();
			},
			popoverTitle = function (nodeTitle) {
				titleTemplate.find('[data-mm-role=popover-title]').text(nodeTitle);
				return titleTemplate.html();
			},
			onEdit = function (collaborator, node) {
				currentCollaborator = collaborator;
				img.popover('destroy');
				img.attr('src', collaborator.photoUrl);
				img.css('border-color', collaborator.color);
				img.popover({
					title: popoverTitle(collaborator.name),
					content: popoverContent(node.title),
					placement: 'right',
					trigger: 'manual',
					animation: true,
					html: true
				});
				element.fadeIn(200, function () {
					setTimeout(function () {
						img.popover('destroy');
						element.fadeOut();
					}, timeout);
				});
				img.popover('show');
			};
		img.click(showCollaborator);
		collaborationModel.addEventListener('collaboratorDidEdit', _.throttle(onEdit, timeout + 700, {trailing: false}));
	});
};

