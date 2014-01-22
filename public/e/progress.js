/*global MM, _, observable, jQuery, $, window*/

MM.progressAggregation = function (statusAttributeName, statusConfigAttr) {
	'use strict';
	return function (activeContent, filter) {
		var recalculate = function () {
				var currentCounts = {};
				activeContent.traverse(function (idea) {
					var stat = idea.attr && idea.attr[statusAttributeName];
					if (stat && (!filter || !filter.statuses  || _.include(filter.statuses, stat))) {
						currentCounts[stat] = (currentCounts[stat] + 1) || 1;
					}
				});
				return currentCounts;
			},
			statusConfig = activeContent && activeContent.attr && activeContent.attr[statusConfigAttr] || {},
				flattened = _.map(recalculate(activeContent, filter), function (v, k) {
					return [k, v];
				}),
				sorted = _.sortBy(flattened, function (row) {
					var config = statusConfig[row[0]] || {};
					return config.description || row[0];
				});
		sorted = _.sortBy(sorted, function (row) {
				var config = statusConfig[row[0]] || {};
				if (config.priority)  {
					return -1 * config.priority;
				}
				return 0;
			});
		_.each(sorted, function (row) {
			row[0] = (statusConfig[row[0]] && statusConfig[row[0]].description) || row[0];
		});
		return sorted;
	};
};

MM.CalcModel = function (aggregation, mapController) {
	'use strict';
	var self = observable(this),
		oldAddEventListener = self.addEventListener,
		activeContent,
		activeFilter,
		currentData,
		recalcAndPublish = function () {
			if (self.listeners('dataUpdated').length > 0) {
				currentData = aggregation(activeContent, activeFilter);
				self.dispatchEvent('dataUpdated', currentData, activeFilter);
			}
		},
		setActiveContent = function (mapId, content) {
			if (activeContent) {
				activeContent.removeEventListener('changed', recalcAndPublish);
			}
			activeContent = content;
			recalcAndPublish();
			activeContent.addEventListener('changed', recalcAndPublish);
		};
	self.addEventListener = function (event, listener) {
		if (self.listeners('dataUpdated').length === 0) {
			currentData = aggregation(activeContent, activeFilter);
		}
		oldAddEventListener(event, listener);
		listener.apply(undefined, [currentData, activeFilter]);
	};
	self.setFilter = function (newFilter) {
		activeFilter = newFilter;
		recalcAndPublish();
	};
	self.getFilter = function () {
		return activeFilter;
	};
	mapController.addEventListener('mapLoaded', setActiveContent);
};

$.fn.progressFilterWidget = function (calcModel) {
	'use strict';
	return this.each(function () {
		var self = jQuery(this),
			toggleButton = self.find('[data-mm-role=toggle-widget]'),
			filterSection = self.find('[data-mm-role=filter]'),
			onFilterChanged = function () {},
			setFilterUIVisible = function (visible) {
				if (visible) {
					filterSection.show();
					calcModel.addEventListener('dataUpdated', onFilterChanged);
				} else {
					filterSection.hide();
					calcModel.removeEventListener('dataUpdated', onFilterChanged);
				}
			};
		filterSection.hide();
		toggleButton.click(function () {
			setFilterUIVisible(filterSection.css('display') === 'none');
		});
	});
};

$.fn.calcWidget = function (calcModel) {
	'use strict';
	return this.each(function () {
		var self = jQuery(this),
		    table = self.find('[data-mm-role=calc-table]'),
		    msgDiv = self.find('[data-mm-role=empty]'),
			repopulateTable = function (data) {
				table.empty();
				if (_.isEmpty(data)) {
					table.hide();
					msgDiv.show();
				} else {
					table.show();
					msgDiv.hide();
					_.each(data, function (row) {
						var rowDOM = jQuery('<tr>').appendTo(table);
						_.each(row, function (cell) {
							var cellDOM = jQuery('<td>').appendTo(rowDOM);
							cellDOM.text(cell);
						});
					});
				}
			},
			id = self.attr('id'),
			toggleButtons = jQuery('[data-mm-role=toggle-widget][data-mm-calc-id='  + id + ']'),
			setWidgetVisible = function (visible) {
				if (visible) {
					calcModel.addEventListener('dataUpdated', repopulateTable);
					self.show();
				} else {
					calcModel.removeEventListener('dataUpdated', repopulateTable);
					self.hide();
				}
			};
		if (table.length === 0) { throw ('Calc table not found, cannot initialise widget'); }
		setWidgetVisible(false);
		toggleButtons.click(function () {
			setWidgetVisible(!self.is(':visible'));
		});
	});
};

MM.ContentStatusUpdater = function (statusAttributeName, statusConfigurationAttributeName, mapController) {
	'use strict';
	var self = observable(this),
		content,
		findStatus = function (statusName) {
			return content.getAttr(statusConfigurationAttributeName)[statusName];
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
		},
		clearStatus = function (ideaId) {
			var statusName = content.getAttrById(ideaId, statusAttributeName),
				status = statusName && findStatus(statusName),
				currentStyle;
			if (status) {
				if (status.icon) {
					content.updateAttr(ideaId, 'icon', false);
				}
				if (status.style) {
					currentStyle = content.getAttrById(ideaId, 'style');
					content.updateAttr(ideaId, 'style', _.omit(currentStyle, _.keys(status.style)));
				}
			}
			content.updateAttr(ideaId, statusAttributeName, false);
		},
		recursiveClear = function (idea) {
			clearStatus(idea.id);
			_.each(idea.ideas, recursiveClear);
		};
	self.setStatusConfig = function (statusConfig) {
		if (!statusConfig) {
			content.updateAttr(content.id, statusConfigurationAttributeName, false);
			return;
		}
		var validatedConfig = {};
		_.each(statusConfig, function (element, key) {
			validatedConfig[key] = _.clone(element);
			if (isNaN(validatedConfig[key].priority)) {
				delete validatedConfig[key].priority;
			}
		});
		content.updateAttr(content.id, statusConfigurationAttributeName, validatedConfig);
	};

	self.updateStatus = function (ideaId, newStatusName) {
		var result = false,
			changeStatus = function (id, statusName) {
				var status = findStatus(statusName),
					merged;
				if (!status) {
					return false;
				}
				clearStatus(id);
				if (status.style) {
					merged = _.extend({}, content.getAttrById(id, 'style'), status.style);
					content.updateAttr(id, 'style', merged);
				}
				if (status.icon) {
					content.updateAttr(id, 'icon', status.icon);
				}
				return content.updateAttr(id, statusAttributeName, statusName);
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
			result = true;
		}
		return result;
	};
	self.clear = function () {
		recursiveClear(content);
	};
	self.refresh = function () {
		self.dispatchEvent('configChanged', content.getAttr(statusConfigurationAttributeName));
	};
	mapController.addEventListener('mapLoaded', function (mapId, mapContent) {
		bindTo(mapContent);
		self.refresh();
	});

};
jQuery.fn.progressStatusUpdateWidget = function (updater, mapModel, configurations, alertController) {
	'use strict';
	var	element = this,
		template = element.find('[data-mm-role=status-template]').detach(),
		generateStatuses = function (config) {
			var domParent = element.find('[data-mm-role=status-list]'),
				configWithKeys = _.map(config, function (val, idx) {return _.extend({key: idx}, val); }),
				sortedAlpha = _.sortBy(configWithKeys, function (status) {
					return status.description || status.key;
				}),
				sortedConfig = _.sortBy(sortedAlpha, function (status) {
					return -1 * status.priority || 0;
				});
			_.each(sortedConfig.reverse(), function (status) {
				var newItem = template.clone().prependTo(domParent);
				newItem.attr('data-mm-role', 'progress');
				if (status.style && status.style.background) {
					newItem.find('[data-mm-role=status-color]').css('backgroundColor', status.style.background).val(status.style.background);
				}
				newItem.find('[data-mm-role=status-name]').text(status.description);
				newItem.attr('data-mm-progress-key', status.key);
				newItem.find('[data-mm-role=status-priority]').text(status.priority);
				newItem.find('[data-mm-role=set-status]').click(function () {
					mapModel.applyToActivated(function (id) {
						updater.updateStatus(id, status.key);
					});
				});
				MM.Extensions.progress.updateIcon(newItem.find('[data-mm-role=status-icon]'), status.icon);

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
		urlForStatusConfigFile = function (configName) {
			return '/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/' + configName;
		},
		bindGenericFunctions = function () {
			element.find('[data-mm-role=start]').click(function () {
				var type = jQuery(this).data('mm-progress-type'),
					statusConfig = configurations[type],
					alertId;
				if (_.isObject(statusConfig)) {
					updater.setStatusConfig(statusConfig);
				} else {
					alertId = alertController.show('<i class="icon-spinner icon-spin" />&nbsp;Loading progress configuration', statusConfig, 'info');
					jQuery.ajax({
						url: urlForStatusConfigFile(statusConfig),
						dataType: 'json'
					}).then(function (result) {
						alertController.hide(alertId);
						updater.setStatusConfig(result);
					}, function () {
						alertController.hide(alertId);
						alertController.show('Error Loading progress configuration from URL', statusConfig, 'error');
					});
				}
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
			element.find('[data-mm-role=save]').click(function () {
				var config = {},
					statuses = element.find('[data-mm-role=status-list] [data-mm-role=progress]'),
					existing = _.reject(
						_.unique(_.map(statuses, function (x) { return parseInt(jQuery(x).attr('data-mm-progress-key'), 10); })),
						function (x) {return isNaN(x); }
					),
					autoKey = 1;
				if (existing.length > 0) {
					autoKey = 1 + _.max(existing);
				}
				statuses.each(function () {
					var status = jQuery(this),
						statusConfig = {
							description: status.find('[data-mm-role=status-name]').text(),
						},
						backgroundColor = status.find('[data-mm-role=status-color]').val(),
						icon = status.find('[data-mm-role=status-icon]').data('icon'),
						priority = status.find('[data-mm-role=status-priority]').text(),
						key = status.attr('data-mm-progress-key');
					if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'false') {
						statusConfig.style = {background: backgroundColor };
					}
					if (icon) {
						statusConfig.icon = icon;
					}
					if (!key) {
						key = autoKey++;
					}
					if (priority) {
						statusConfig.priority = priority;
					}
					config[key] = statusConfig;
				});
				updater.setStatusConfig(config);
			});
		};
	bindGenericFunctions();
	updater.addEventListener('configChanged', function (config) {
		updateUI(config);
	});
	updateUI();
	return this;
};
jQuery.fn.tableCellInPlaceEditorWidget = function () {
	'use strict';

	this.click(function () {
		var element = jQuery(this),
			previousText = element.text(),
			input,
			setContent = function (value) {
				element.empty().text(value);
			},
			oldWidth = Math.max(element.innerWidth() - 60, 50);
		element.empty();
		input = jQuery('<input width="100%">').appendTo(element).val(previousText)
			.blur(function () {
				setContent(input.val());
			}).keydown('esc', function (e) {
				setContent(previousText);
				e.preventDefault();
				e.stopPropagation();
			}).keydown('return', function (e) {
				setContent(input.val());
				e.preventDefault();
				e.stopPropagation();
			}).width(oldWidth).click(function (e) {
				e.stopPropagation();
				e.preventDefault();
			}).focus();
	});
	this.css('cursor', 'pointer');
	return this;
};
jQuery.fn.tableEditWidget = function (contentRefreshCallBack, iconEditor) {
	'use strict';
	var modal = this,
		template = modal.find('[data-mm-role=status-template]').clone().removeAttr('data-mm-role'),
		rebind = function (container) {
			container.find('[data-mm-editable]').tableCellInPlaceEditorWidget().removeAttr('data-mm-editable');
			container.find('[data-mm-color-picker]').removeAttr('data-mm-color-picker').colorPicker();
			container.find('[data-mm-role=remove]').click(function () {
				jQuery(this).parents('tr').fadeOut(500, function () {
					jQuery(this).remove();
				});
			}).removeAttr('data-mm-role');
			container.find('[data-mm-role=status-icon]').click(function () {
				var statusIconDom = $(this);
				iconEditor.editIcon(statusIconDom.data('icon')).then(function (newIcon) {
					MM.Extensions.progress.updateIcon(statusIconDom, newIcon);
				});
			});
		};
	modal.on('show', function () {
		if (contentRefreshCallBack()) {
			contentRefreshCallBack();
		}
		rebind(modal);
	});
	modal.find('[data-mm-role=append]').click(function () {
		var newItem = template.clone().attr('data-mm-role', template.attr('data-mm-new-role')).appendTo(modal.find('[data-mm-role=status-list]'));
		rebind(newItem);
		newItem.find('[data-mm-default-edit]').click();
	});
	return modal;
};

MM.Extensions.progress = function () {
	'use strict';
	var statusConfigurationAttributeName = MM.Extensions.config.progress.aggregateAttributeName,
		statusAttributeName = 'progress',
		mapController = MM.Extensions.components.mapController,
		alertController = MM.Extensions.components.alert,
		mapModel = MM.Extensions.components.mapModel,
		iconEditor = MM.Extensions.components.iconEditor,
		loadUI = function (html) {
			var parsed = $(html),
				menu = parsed.find('[data-mm-role=top-menu]').clone().appendTo($('#mainMenu')),
				toolbar = parsed.find('[data-mm-role=floating-toolbar]').clone().appendTo($('body')).draggable().css('position', 'absolute'),
				modal = parsed.find('[data-mm-role=modal]').clone().appendTo($('body')),
				calcWidget = parsed.find('#progress-calc-widget'),
				updater;
			$('#mainMenu').find('[data-mm-role=optional]').hide();
			updater = new MM.ContentStatusUpdater(statusAttributeName, statusConfigurationAttributeName, mapController);
			menu.progressStatusUpdateWidget(updater, mapModel, MM.Extensions.progress.statusConfig, alertController);
			toolbar.progressStatusUpdateWidget(updater, mapModel, MM.Extensions.progress.statusConfig, alertController);
			modal.tableEditWidget(updater.refresh.bind(updater), iconEditor).progressStatusUpdateWidget(updater, mapModel, MM.Extensions.progress.statusConfig, alertController);
			calcWidget.detach().appendTo($('body')).calcWidget(new MM.CalcModel(MM.progressAggregation(statusAttributeName, statusConfigurationAttributeName), mapController)).floatingToolbarWidget();
		};
	$.get('/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/progress.html', loadUI);
	$('<link rel="stylesheet" href="' +  MM.Extensions.mmConfig.cachePreventionKey + '/e/progress.css" />').appendTo($('body'));
};
MM.Extensions.progress.updateIcon = function (selector, icon) {
	'use strict';
	selector.data('icon', icon);
	if (icon) {
		selector.find('[data-mm-role=icon-image-placeholder]').attr('src', icon.url).show();
		selector.find('[data-mm-role=icon-no-image]').hide();
	} else {
		selector.find('[data-mm-role=icon-image-placeholder]').hide();
		selector.find('[data-mm-role=icon-no-image]').show();
	}
};
MM.Extensions.progress.statusConfig = {};
MM.Extensions.progress.statusConfig.testing = {
	'': {
		description: 'Not Started',
		priority: 1,
		style: {
			background: false
		}
	},
	'passing': {
		description: 'Passed',
		style: {
			background: '#00CC00'
		}
	},
	'in-progress': {
		description: 'In Progress',
		priority: 2,
		style: {
			background: '#FFCC00'
		}
	},
	'failure': {
		description: 'Failed',
		priority: 999,
		style: {
			background: '#FF3300'
		}
	}
};
MM.Extensions.progress.statusConfig.tasks = {
	'': {
		description: 'Not Started',
		priority: 1,
		style: {
			background: false
		}
	},
	'passing': {
		description: 'Done',
		style: {
			background: '#00CC00'
		}
	},
	'under-review' : {
		description: 'Under review',
		style: {
			background: '#00CCFF'
		}
	},
	'in-progress': {
		description: 'In Progress',
		priority: 3,
		style: {
			background: '#FFCC00'
		}
	},
	'blocked': {
		description: 'Blocked',
		priority: 4,
		style: {
			background: '#990033'
		}
	},
	'parked': {
		description: 'Parked',
		priority: 2,
		style: {
			background: '#FF3300'
		}
	}
};
MM.Extensions.progress.statusConfig.testingWithIcons = 'progress-testing-with-flat-icons.json';
MM.Extensions.progress.statusConfig.testingWith3DIcons = 'progress-testing-with-3d-icons.json';
MM.Extensions.progress.statusConfig.tasksWith3DIcons = 'progress-tasks-with-3d-icons.json';
MM.Extensions.progress.statusConfig.tasksWithIcons = 'progress-tasks-with-flat-icons.json';
if (!window.jasmine) {
	MM.Extensions.progress();
}
