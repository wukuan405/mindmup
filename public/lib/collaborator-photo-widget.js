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
jQuery.fn.collaboratorPhotoWidget = function (collaborationModel, imageLoader, imgClass) {
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
			};
	collaborationModel.addEventListener('disconnected', function () {
		_.each(cachedImages, function(val) {val.remove();});
		cachedImages={};
	});
	collaborationModel.addEventListener('collaboratorFocusChanged', showPictureForCollaborator);

	collaborationModel.addEventListener('collaboratorPresenceChanged', function (collaborator, isOnline) {
		if (isOnline) {
			showPictureForCollaborator(collaborator);
		}
		else {
			var cached = cachedImages[collaborator.sessionId];
			if (cached && cached.length > 0) {
				cached.remove();
				cachedImages[collaborator.sessionId] = undefined;
			}
		}
	});
	return self;
};
MM.CollaboratorAlerts = function (alert, collaborationModel) {
	'use strict';
	var	prevAlert,
			showUpdate = function (caption, text) {
				if (prevAlert) {
					alert.hide(prevAlert);
				}
				prevAlert = alert.show(caption, text, 'flash');
			};
	collaborationModel.addEventListener('collaboratorPresenceChanged', function (collaborator, isOnline) {
			if (isOnline) {
				showUpdate('Collaborator joined:', collaborator.name + ' joined this session');
			} else {
				showUpdate('Collaborator left:', collaborator.name + ' left this session');
			}
	});
};
