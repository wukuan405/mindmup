/*global jQuery, MM*/
MM.deferredImageLoader = function (url) {
	'use strict';
	var result = jQuery.Deferred(),
			domImg = new Image();
	domImg.onload = function loadImage() {
		result.resolve(jQuery(domImg));
	};
	domImg.src = url;
	return result.promise();
};
jQuery.fn.collaboratorPhotoWidget = function (collaborationModel, imageLoader, imgClass, followedCollaboratorClass) {
	'use strict';
	var self = jQuery(this),
			showPictureInNode = function (nodeId, jQueryImg) {
				var node = self.nodeWithId(nodeId);
				if (node && node.length > 0) {
					jQueryImg.appendTo(node).css({
						bottom: -1 * Math.round(jQueryImg.height() / 2),
						right: -1 * Math.round(jQueryImg.width() / 2)
					});
				}
			},
			onPhotoTap = function (e) {
				e.stopPropagation();
				if (e.gesture) {
					e.gesture.stopPropagation();
				}
				collaborationModel.toggleFollow(jQuery(this).attr('data-mm-collaborator-id'));
			},
			imageForCollaborator = function(sessionId) {
				return self.find('.' + imgClass + '[data-mm-collaborator-id=' + sessionId + ']');
			},
			showPictureForCollaborator = function (collaborator) {
				var cached = imageForCollaborator(collaborator.sessionId);
				if (cached && cached.length > 0) {
						showPictureInNode(collaborator.focusNodeId, cached);
				} else {
					imageLoader(collaborator.photoUrl).then(function(jQueryImg) {
						if (imageForCollaborator(collaborator.sessionId).length === 0) {
							jQueryImg.addClass(imgClass).attr('data-mm-collaborator-id', collaborator.sessionId).on('tap', onPhotoTap);
							showPictureInNode(collaborator.focusNodeId, jQueryImg);
						}
					});
				}
			},
			removePictureForCollaborator = function (collaborator) {
				imageForCollaborator(collaborator.sessionId).remove();
			},
			changeFollowedCollaborator = function (sessionId) {
				self.find('.' + followedCollaboratorClass).removeClass(followedCollaboratorClass);
				imageForCollaborator(sessionId).addClass(followedCollaboratorClass);
			};
	collaborationModel.addEventListener('stopped', function () {
		self.find('.' + imgClass).remove();
	});
	collaborationModel.addEventListener('collaboratorFocusChanged collaboratorJoined', showPictureForCollaborator);
	collaborationModel.addEventListener('collaboratorLeft', removePictureForCollaborator);
	collaborationModel.addEventListener('followedCollaboratorChanged', changeFollowedCollaborator);

	return self;
};
