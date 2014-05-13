/*global MM, observable*/

MM.ActiveContentListener = function (mapController)  {
	'use strict';
	var self = observable(this),
		activeContent,
		onChanged = function (isNewContent) {
			self.dispatchEvent('mm-active-content-changed', activeContent, !!isNewContent);
		},
		onMapLoaded = function (newMapId, content) {
			if (activeContent) {
				activeContent.removeEventListener('changed', onChanged);
			}
			activeContent = content;
			self.dispatchEvent('mm-active-content-changed', activeContent, true);
			activeContent.addEventListener('changed', onChanged);
		};
	mapController.addEventListener('mapLoaded', onMapLoaded);
	self.getActiveContent = function () {
		return activeContent;
	};
	self.addListener = function (onActiveContentChanged) {
		if (activeContent) {
			onActiveContentChanged(activeContent, false);
		}
		self.addEventListener('mm-active-content-changed', onActiveContentChanged);

	};
};