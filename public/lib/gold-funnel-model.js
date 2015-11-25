/*global MM, observable */
MM.GoldFunnelModel = function (activityLog) {
	'use strict';
	var self = observable(this),
		funnelId = 'direct',
		logCategory = 'goldFunnel';
	self.setFunnelId = function (newFunnelId) {
		funnelId = newFunnelId;
	};
	self.step = function (segment, stepName) {
		activityLog.log(logCategory, segment + ':' + stepName, funnelId);
	};
};
