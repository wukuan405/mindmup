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
			template = element.find('[data-mm-role=template]').detach(),
			popoverContent = function (nodeTitle) {
				template.find('[data-mm-role=text]').text(nodeTitle);
				return template.html();
			},
			onEdit = function (collaborator, node) {
				currentCollaborator = collaborator;
				img.popover('destroy');
				img.attr('src', collaborator.photoUrl);
				img.css('border-color', collaborator.color);
				img.popover({
					title: collaborator.name + ':',
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

