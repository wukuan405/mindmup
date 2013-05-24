/*global MM, _*/
MM.ContentStatusUpdater = function (statusAttributeName, statusConfigurationAttributeName, content) {
	'use strict';
	var self = this,
		findStatus = function (statusName) {
			return content.getAttr(statusConfigurationAttributeName)[statusName];
		},
		ideaStatus = function (idea) {
			return findStatus(idea.getAttr(statusAttributeName));
		};

	self.updateStatus = function (ideaId, newStatusName) {
		var status = findStatus(newStatusName),
			changeStatus = function (id) {
				var merged = _.extend({}, content.getAttrById(id, 'style'), status.style);
				return content.updateAttr(id, 'style', merged) && content.updateAttr(id, statusAttributeName, newStatusName);
			},
			shouldPropagate = function (parent) {
				return _.all(parent.ideas, function (child) {
					var childStatus = ideaStatus(child);

					if (childStatus === status) {
						return true;
					}
					if (!status.priority) {
						return false;
					}
					if (!childStatus || !childStatus.priority) {
						return true;
					}
					return childStatus.priority < status.priority;
				});
			};
		if (!status) {
			return false;
		}
		if (changeStatus(ideaId, status, newStatusName)) {
			_.each(content.calculatePath(ideaId), function (parent) {
				if (shouldPropagate(parent)) {
					changeStatus(parent.id, status);
				}
			});
			return true;
		}
		return false;
	};
	self.config = function () {
		return content.getAttr(statusConfigurationAttributeName);
	};
};
