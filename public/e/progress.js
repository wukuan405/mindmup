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
				toolbar = parsed.find('[data-mm-role=floating-toolbar]').clone().appendTo($('body')).draggable().css('position', 'absolute'),
				menuTemplate = menu.find('[data-mm-role=status-template]').detach(),
				toolbarTemplate = toolbar.find('[data-mm-role=status-template]').detach(),
				currentContent,
				updater,
				generateStatuses = function (updater, domParent, template) {
					_.each(updater.config(), function (status, statusName) {
						var newItem = template.clone().prependTo(domParent);
						newItem.attr('data-mm-role', 'progress');
						newItem.find('[data-mm-role=status-color]').css('backgroundColor', status.style.background);
						newItem.find('[data-mm-role=status-name]').text(status.description);
						newItem.click(function () {
							// analytics!
							updater.updateStatus(currentlySelectedId, statusName);
						});
					});
				},
				updateUI = function (updater, element, elementTemplate) {
					var flag = (updater && updater.config()) ? 'active' : 'inactive',
						items = element.find('[data-mm-progress-visible]');
					items.hide();
					items.filter('[data-mm-progress-visible=' + flag + ']').show();
					element.find('[data-mm-role=progress]').remove();
					if (!updater) {
						return;
					}
					generateStatuses(updater, element.find('[data-mm-role=status-list]'), elementTemplate);
				},
				updateMenus = function (updater) {
					updateUI(updater, menu, menuTemplate);
					updateUI(updater, toolbar, toolbarTemplate);
				},
				bindGenericFunctions = function (domElement) {
					domElement.find('[data-mm-role=start]').click(function () {
						activateProgressOnContent(currentContent, $(this).data('mm-progress-type'));
						return false;
					});
					domElement.find('[data-mm-role=deactivate]').click(function () {
						deactivateProgressOnContent(currentContent);
					});
					domElement.find('[data-mm-role=clear]').click(function () {
						if (updater) {
							updater.clear();
						}
					});
					domElement.find('[data-mm-role=toggle-toolbar]').click(function () {
						$('body').toggleClass('progress-toolbar-active');
					});
					domElement.find('[data-category]').trackingWidget(MM.Extensions.components.activityLog);
					if (!MM.Extensions.mmConfig.isTouch) {
						domElement.find('[rel=tooltip]').tooltip();
					}
				};
			$('#mainMenu').find('[data-mm-role=optional]').hide();
			bindGenericFunctions(menu);
			bindGenericFunctions(toolbar);
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
			updateMenus();
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
