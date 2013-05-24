/*global MM, _, $*/
MM.Extensions.progress = function () {
	'use strict';
	var statusConfigurationAttributeName = 'progress-statuses',
		statusAttributeName = 'progress',
		mapController = MM.Extensions.components.mapController,
		mapModel = MM.Extensions.components.mapModel,
		currentlySelectedId,
		activateProgressOnContent = function (content, type) {
			content.updateAttr(content.id, statusConfigurationAttributeName, MM.Extensions.progress.statusConfig[type]);
		},
		deactivateProgressOnContent = function (content) {
			content.updateAttr(content.id, statusConfigurationAttributeName, false);
		},
		loadUI = function (html) {
			var parsed = $(html),
				menu = parsed.find('[data-mm-role=top-menu]').clone().appendTo($('#mainMenu')),
				template = menu.find('[data-mm-role=status-template]').detach(),
				currentContent,
				updater,
				updateMenus = function (updater) {
					var flag = updater.config() ? 'active' : 'inactive',
						items = menu.find('[data-mm-progress-visible]');
					items.hide();
					items.filter('[data-mm-progress-visible=' + flag + ']').show();
					menu.find('[data-mm-role=progress]').remove();
					_.each(updater.config(), function (status, statusName) {
						var newItem = template.clone().prependTo(menu.children('ul'));
						newItem.attr('data-mm-role', 'progress');
						newItem.find('[data-mm-role=status-color]').css('backgroundColor', status.style.background);
						newItem.find('[data-mm-role=status-name]').text(status.description);
						newItem.click(function () {
							// analytics!
							updater.updateStatus(currentlySelectedId, statusName);
						});
					});
				};
			$('#mainMenu').find('[data-mm-role=optional]').hide();
			menu.find('[data-mm-role=start]').click(function () {
				activateProgressOnContent(currentContent, $(this).data('mm-progress-type'));
				return false;
			});
			menu.find('[data-mm-role=deactivate]').click(function () {
				deactivateProgressOnContent(currentContent);
			});
			menu.find('[data-mm-role=clear]').click(function () {
				if (updater) {
					updater.clear();
				}
			});
			menu.find('[data-category]').trackingWidget(MM.Extensions.components.activityLog);
			mapController.addEventListener('mapLoaded', function (mapId, content) {
				updater = new MM.ContentStatusUpdater(statusAttributeName, statusConfigurationAttributeName, content);
				currentContent = content;
				updateMenus(updater);
				content.addEventListener('changed', function (method, attrs) {
					/*jslint eqeq: true*/
					if (method === 'updateAttr' && attrs[0] == content.id && attrs[1] === statusConfigurationAttributeName) {
						updateMenus(updater);
					}
				});
			});
			mapModel.addEventListener('nodeSelectionChanged', function (id) {
				currentlySelectedId = id;
			});
		};
	$.get('/' + MM.Extensions.mmConfig.cachePreventionKey + '/e/progress.html', loadUI);
	$('<link rel="stylesheet" href="' +  MM.Extensions.mmConfig.cachePreventionKey + '/e/progress.css" />').appendTo($('body'));
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
MM.Extensions.progress();
