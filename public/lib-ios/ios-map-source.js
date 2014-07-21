/*global jQuery, MM*/
MM.IOSMapSource = function (content) {
	'use strict';
	var properties = {editable: true};
	this.recognises = function () {
		return true;
	};
	this.loadMap = function (mapId) {
		return jQuery.Deferred().resolve(content, mapId, properties).promise();
	};
};
