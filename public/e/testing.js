/*global MM, _*/
MM.ContentStatusUpdater = function (statusAttributeName, statusConfigurationAttributeName, content) {
	'use strict';
	var self = this;

	self.updateStatus = function (ideaId, newStatusName) {
		var status = content.getAttr(statusConfigurationAttributeName)[newStatusName],
			changeStatus = function (id) {
				var merged = _.extend({}, content.getAttrById(id, 'style'), status.style);
				return content.updateAttr(id, 'style', merged) && content.updateAttr(id, statusAttributeName, newStatusName);
			};
		if (!status) {
			return false;
		}
		if (changeStatus(ideaId, status, newStatusName)) {
			_.each(content.calculatePath(ideaId), function (parent) {
				if (_.all(parent.ideas, function (child) {
					return child.getAttr(statusAttributeName) === newStatusName;
				})) {
					changeStatus(parent.id, status);
				}
			});
			return true;
		}
		return false;
	};
};