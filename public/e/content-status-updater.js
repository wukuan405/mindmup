/*global MM, _*/
MM.ContentStatusUpdater = function (statusAttributeName, statusConfigurationAttributeName, content) {
	'use strict';
	var self = this,
		findStatus = function (statusName) {
			return content.getAttr(statusConfigurationAttributeName)[statusName];
		},
		ideaStatus = function (idea) {
			return findStatus(idea.getAttr(statusAttributeName));
		},
		statusPriority = function (statusName) {
			var s = findStatus(statusName);
			return s && s.priority;
		};
	self.updateStatus = function (ideaId, newStatusName) {
		var changeStatus = function (id, statusName) {
				var status = findStatus(statusName),
					merged;
				if (!status) {
					return false;
				}
				merged = _.extend({}, content.getAttrById(id, 'style'), status.style);
				return content.updateAttr(id, 'style', merged) && content.updateAttr(id, statusAttributeName, statusName);
			},
			shouldPropagate = function (parent) {
				var childStatusNames = _.uniq(_.map(parent.ideas, function (child) {
					return child.getAttr(statusAttributeName);
				}));
				if (childStatusNames.length === 1) {
					return childStatusNames[0];
				}
				if (!_.some(childStatusNames, statusPriority)) {
					return false;
				}
				return _.max(childStatusNames, statusPriority);
			};

		if (changeStatus(ideaId, newStatusName)) {
			_.each(content.calculatePath(ideaId), function (parent) {
				var parentStatusName = shouldPropagate(parent);
				if (parentStatusName) {
					changeStatus(parent.id, parentStatusName);
				}
			});
			return true;
		}
		return false;
	};
	self.clear = function (idea) {
		idea = idea || content;
		if (idea.getAttr(statusAttributeName)) {
			content.updateAttr(idea.id, 'style', false);
			content.updateAttr(idea.id, statusAttributeName, false);
		}
		_.each(idea.ideas, self.clear);
	};
	self.config = function () {
		return content.getAttr(statusConfigurationAttributeName);
	};
};
