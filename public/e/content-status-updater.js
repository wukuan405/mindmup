/*global MM, _, observable, jQuery*/
MM.ContentStatusUpdater = function (statusAttributeName, statusConfigurationAttributeName, mapController) {
	'use strict';
	var self = observable(this),
		content,
		findStatus = function (statusName) {
			return content.getAttr(statusConfigurationAttributeName)[statusName];
		},
		ideaStatus = function (idea) {
			return findStatus(idea.getAttr(statusAttributeName));
		},
		statusPriority = function (statusName) {
			var s = findStatus(statusName);
			return s && s.priority;
		},
		bindTo = function (mapContent) {
			content = mapContent;
			content.addEventListener('changed', function (method, attrs) {
				/*jslint eqeq: true*/
				if (method === 'updateAttr' && attrs[0] == content.id && attrs[1] === statusConfigurationAttributeName) {
					self.dispatchEvent('configChanged', attrs[2]);
				}
			});
		};
	self.setStatusConfig = function (statusConfig) {
		content.updateAttr(content.id, statusConfigurationAttributeName, statusConfig);
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
	mapController.addEventListener('mapLoaded', function (mapId, mapContent) {
		bindTo(mapContent);
		self.dispatchEvent('configChanged', content.getAttr(statusConfigurationAttributeName));
	});
};
jQuery.fn.progressStatusUpdateWidget = function (updater, mapModel, configurations) {
	'use strict';
	var	element = this,
		template = element.find('[data-mm-role=status-template]').detach(),
		currentlySelectedId,
		generateStatuses = function (config) {
			var domParent = element.find('[data-mm-role=status-list]');
			_.each(config, function (status, statusName) {
				var newItem = template.clone().prependTo(domParent);
				newItem.attr('data-mm-role', 'progress');
				newItem.find('[data-mm-role=status-color]').css('backgroundColor', status.style.background);
				newItem.find('[data-mm-role=status-name]').text(status.description);
				newItem.click(function () {
					updater.updateStatus(currentlySelectedId, statusName);
				});
			});
		},
		updateUI = function (config) {
			var flag = (config) ? 'active' : 'inactive',
				items = element.find('[data-mm-progress-visible]');
			items.hide();
			items.filter('[data-mm-progress-visible=' + flag + ']').show();
			element.find('[data-mm-role=progress]').remove();
			if (!updater) {
				return;
			}
			generateStatuses(config);
		},
		bindGenericFunctions = function () {
			element.find('[data-mm-role=start]').click(function () {
				var type = jQuery(this).data('mm-progress-type');
				updater.setStatusConfig(configurations[type]);
				return false;
			});
			element.find('[data-mm-role=deactivate]').click(function () {
				updater.setStatusConfig(false);
			});
			element.find('[data-mm-role=clear]').click(function () {
				if (updater) {
					updater.clear();
				}
			});
			element.find('[data-mm-role=toggle-toolbar]').click(function () {
				jQuery('body').toggleClass('progress-toolbar-active');
			});
		};
	mapModel.addEventListener('nodeSelectionChanged', function (id) {
		currentlySelectedId = id;
	});
	bindGenericFunctions();
	updater.addEventListener('configChanged', function (config) {
		updateUI(config);
	});
	updateUI();
	return this;
};
