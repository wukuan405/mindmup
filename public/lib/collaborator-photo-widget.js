/*global jQuery, MM, _*/
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
			cachedImages = {},
			showPictureInNode = function (nodeId, jQueryImg) {
				var node = self.nodeWithId(nodeId);
				if (node && node.length > 0) {
					jQueryImg.appendTo(node).css({
						bottom: -1 * Math.round(jQueryImg.height() / 2),
						right: -1 * Math.round(jQueryImg.width() / 2),
						position: 'relative'
					});
				}
			},
			onPhotoTap = function (e) {
				e.stopPropagation();
				if (e.gesture) {
					e.gesture.stopPropagation();
				}
				collaborationModel.toggleFollow(jQuery(this).data('sessionId'));
			},
			showPictureForCollaborator = function (collaborator) {
				var cached = cachedImages[collaborator.sessionId];
				if (cached && cached.length > 0) {
						showPictureInNode(collaborator.focusNodeId, cached);
				} else {
					imageLoader(collaborator.photoUrl).then(function(jQueryImg) {
						cachedImages[collaborator.sessionId] = jQueryImg;
						jQueryImg.addClass(imgClass).data('sessionId', collaborator.sessionId).on('tap', onPhotoTap);
						showPictureInNode(collaborator.focusNodeId, jQueryImg);
					});
				}
			},
			removePictureForCollaborator = function (collaborator) {
				var cached = cachedImages[collaborator.sessionId];
				if (cached && cached.length > 0) {
					cached.remove();
					cachedImages[collaborator.sessionId] = undefined;
				}
			},
			changeFollowedCollaborator = function (sessionId) {
				_.each(cachedImages, function (jQueryImg) {
					jQueryImg.removeClass(followedCollaboratorClass);
				});
				if (sessionId && cachedImages[sessionId]) {
					cachedImages[sessionId].addClass(followedCollaboratorClass);
				}
			};
	collaborationModel.addEventListener('stopped', function () {
		_.each(cachedImages, function(val) {val.remove();});
		cachedImages={};
	});
	collaborationModel.addEventListener('collaboratorFocusChanged collaboratorJoined', showPictureForCollaborator);
	collaborationModel.addEventListener('collaboratorLeft', removePictureForCollaborator);
	collaborationModel.addEventListener('followedCollaboratorChanged', changeFollowedCollaborator);

	return self;
};
