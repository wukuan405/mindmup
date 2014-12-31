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
			showPicture = function (nodeId, jQueryImg) {
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
			};
	collaborationModel.addEventListener('disconnected', function () {
		_.each(cachedImages, function(val) {val.remove();});
		cachedImages={};
	});
	collaborationModel.addEventListener('collaboratorFocusChanged', function (collaborator) {
		var cached = cachedImages[collaborator.sessionId];
		if (cached && cached.length > 0) {
				showPicture(collaborator.focusNodeId, cached);
		} else {
			imageLoader(collaborator.photoUrl).then(function(jQueryImg) {
				cachedImages[collaborator.sessionId] = jQueryImg;
				jQueryImg.addClass(imgClass).data('sessionId', collaborator.sessionId).on('tap', onPhotoTap);
				showPicture(collaborator.focusNodeId, jQueryImg);
			});
		}
	});
	return self;
};
