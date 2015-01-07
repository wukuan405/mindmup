/*global jQuery */
jQuery.fn.collaboratorListWidget = function (collaborationModel, followedCollaboratorClass) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this),
				list = element.find('[data-mm-role=collab-list]'),
				template = list.find('[data-mm-role=template]').detach(),
				noCollaborators = element.find('[data-mm-role=no-collaborators]'),
				itemForSession = function (sessionId) {
					return list.find('[mm-session-id='+ sessionId + ']');
				},
				addCollaborator = function (collaborator) {
					if (itemForSession(collaborator.sessionId).size() > 0) {
						return;
					}
					var newItem = template.clone().appendTo(list).attr('mm-session-id', collaborator.sessionId);
					newItem.find('[data-mm-role=collaborator-name]').text(collaborator.name);
					newItem.find('[data-mm-role=collaborator-photo]').attr('src', collaborator.photoUrl);
					newItem.find('[data-mm-role=collaborator-follow]').click(function () {
						collaborationModel.toggleFollow(collaborator.sessionId);
					});
					noCollaborators.hide();
					list.show();
				},
				removeCollaborator = function (collaborator) {
					itemForSession(collaborator.sessionId).remove();
					if (list.children().size() === 0) {
						noCollaborators.show();
						list.hide();
					}
				},
				followedCollaboratorChanged = function (sessionId) {
					list.children().removeClass(followedCollaboratorClass);
					itemForSession(sessionId).addClass(followedCollaboratorClass);
				};
		noCollaborators.show();
		list.hide();
		collaborationModel.addEventListener('collaboratorFocusChanged collaboratorJoined', addCollaborator);
		collaborationModel.addEventListener('collaboratorLeft', removeCollaborator);
		collaborationModel.addEventListener('stopped', function () {
			list.empty().hide();
			noCollaborators.show();
		});
		collaborationModel.addEventListener('followedCollaboratorChanged', followedCollaboratorChanged);
	});
};
