/*jslint nomen: true*/
/*global MM, jQuery, MAPJS, console, window, _*/
jQuery.fn.modal = function (options) {
	'use strict';
	return jQuery(this).each(function () {
		var element = jQuery(this);
		if (!options) {
			return;
		}
		if (options.show || options === 'show') {
			element.showModal();
		} else {
			element.hideModal();
		}
	});
};
MAPJS.DOMRender = MAPJS.DOMRender || {};
MAPJS.DOMRender.stageMargin = {top: 60, left: 20, bottom: 100, right: 20};
MAPJS.DOMRender.stageVisibilityMargin = {top: 20, left: 20, bottom: 20, right: 20};

MM.main = function (config) {
	'use strict';
	console.log('MM.main');
	var mmProxy = new MM.IOS.Proxy('mmproxy'),
			activityLog = new MM.ActivityLog(10000),
			setupTracking = function (activityLog, mapModel, mapModelAnalytics) {
				activityLog.addEventListener('log', function () {
					var args = Array.prototype.slice.call(arguments, 0, 3);
					mmProxy.sendMessage({type: 'analytic', args: args});
				});
				activityLog.addEventListener('error', function (message) {
					var args = ['error', message, activityLog.getLog()];
					mmProxy.sendMessage({type: 'analytic', args: args});
				});
				activityLog.addEventListener('timer', function (category, action, time) {
					var args = [category,  action, '', time];
					mmProxy.sendMessage({type: 'analytic', args: args});
				});
				if (mapModelAnalytics) {
					mapModel.addEventListener('analytic', activityLog.log);
				}
				mapModel.addEventListener('layoutChangeStarting', function () {
					var args = Array.prototype.slice.call(arguments, 0);
					mmProxy.sendMessage({'type': 'layoutChangeStarting', 'args': args});
				});
				mapModel.addEventListener('layoutChangeComplete', function () {
					var args = Array.prototype.slice.call(arguments, 0);
					mmProxy.sendMessage({'type': 'layoutChangeComplete', 'args': args});
				});
			},
			container = jQuery('#container'),
			iosMapSource = new MM.IOSMapSource(MAPJS.content(MM.IOS.defaultMap())),
			mapController = new MM.MapController([iosMapSource]),
			activeContentListener = new MM.ActiveContentListener(mapController),
			resourcePrefix = 'internal',
			resourceCompressor = new MM.ResourceCompressor(resourcePrefix),
			activeContentResourceManager = new MM.ActiveContentResourceManager(activeContentListener, resourcePrefix),
			imageInsertController = new MAPJS.ImageInsertController(config.corsProxyUrl, activeContentResourceManager.storeResource),
			alert = MM.IOS.Alert(mmProxy),
			objectStorage = new MM.JsonStorage(window.localStorage),
			objectClipboard = new MM.LocalStorageClipboard(objectStorage, 'clipboard', alert),
			mapModel = new MAPJS.MapModel(MAPJS.DOMRender.layoutCalculator, ['double-tap this node to edit'], objectClipboard),
			iosStage = new MM.IOSStageAPI(mapModel),
			iconEditor = new MM.iconEditor(mapModel, activeContentResourceManager),
			mapOptions = _.extend({}, config),
			mapModelProxy = new MM.IOS.MapModelProxy(mapModel, mmProxy, activeContentResourceManager, mapOptions),
			confimationProxy = new MM.IOS.ConfirmationProxy(mmProxy),
			autoSave = new MM.AutoSave(mapController, objectStorage, alert, mapModel),
			iosAutoSave = new MM.IOS.AutoSave(autoSave, confimationProxy),
			commandHandlers = [mapModelProxy, confimationProxy],
			mapModelAnalytics = false;


	mapController.addEventListener('mapLoaded', function (mapId, idea) {
		idea.setConfiguration(config.activeContentConfiguration);
		mapModel.setIdea(idea);
		mmProxy.sendMessage({type: 'mapLoaded'});
	});
	iconEditor.addEventListener('iconEditRequested', function (icon) {
		mmProxy.sendMessage({type: 'showMessage', args: {'type': 'info', 'message': 'Loading icon editor, please wait...'}});
		icon = icon || {};
		mmProxy.sendMessage({type: 'iconEditRequested', args: icon});
	});
	setupTracking(activityLog, mapModel, mapModelAnalytics);
	MM.MapController.activityTracking(mapController, activityLog);
	jQuery('[data-mm-role~="ios-modal"]').iosModalWidget();
	jQuery('[data-mm-role~="ios-menu"]').iosMenuWidget(mapModel, mmProxy);
	jQuery('[data-mm-role="ios-context-menu"]').iosPopoverMenuWidget(mapModel, iosStage).iosContextMenuWidget(mapModel, jQuery('[data-mm-menu-role~="context-menu"]'));
	jQuery('[data-mm-role="ios-link-editor"]').iosPopoverMenuWidget().iosMenuWidget(mapModel, mmProxy).iosLinkEditWidget(mapModel);
	jQuery('[data-mm-role="mode-indicator"]').iosModeIndicatorWidget(mapModel);
	jQuery('[data-mm-role~="ios-color-picker"]').iosBackgroundColorWidget(mapModel, [
			'000000', '993300', '333300', '000080', '333399', '333333', '800000', 'FF6600',
			'808000', '008000', '008080', '0000FF', '666699', '808080', 'FF0000', 'FF9900',
			'99CC00', '339966', '33CCCC', '3366FF', '800080', '999999', 'FF00FF', 'FFCC00',
			'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0', 'FF99CC', 'FFCC99',
			'FFFF99', 'CCFFFF', 'FFFFFF', 'transparent'
		]);
	MM.command = MM.command || function (command) {
		var completed = {'completed': true, 'command': command.type};
		var commandHandler = _.find(commandHandlers, function (handler) {
			return handler.handlesCommand(command);
		});
		if (commandHandler) {
			commandHandler.handleCommand(command);
			return completed;
		}
		else if (command.type === 'ping') {
			mmProxy.sendMessage(command);
		}
		else if (command.type === 'setViewport') {
			var currentViewPort = jQuery('meta[name=viewport]').attr('content');
			if (currentViewPort === command.args) {
				return;
			}
			jQuery('meta[name=viewport]').attr('content', command.args);
			jQuery('[data-mm-role="ios-context-menu"]').trigger(jQuery.Event('hidePopover'));
			jQuery('[data-mm-role="ios-link-editor"]').trigger(jQuery.Event('hidePopover'));
			window.setTimeout(function	() {
				if (mapModel && mapModel.resetView && mapModel.getIdea()) {
					mapModel.centerOnNode(mapModel.getSelectedNodeId());
				}
			}, 100);
		}
		else if (command.type && command.type.substr && command.type.substr(0, 9) === 'iosStage:') {
			var stageCommand = command.type.split(':')[1];
			if (iosStage[stageCommand]) {
				iosStage[stageCommand].apply(iosStage, command.args);
			}
		}
		else if (command.type === 'loadMap') {
			var newIdea = command.args[0],
					readonly = command.args[1],
					quickEdit = command.args[2],
					content = MAPJS.content(newIdea),
					mapId = command.args[3] || 'ios-no-autosave',
					touchEnabled = true,
					dragContainer = jQuery('#splittable');

			if (mapId === 'ios-no-autosave') {
				iosAutoSave.off();
			} else {
				iosAutoSave.on();
			}
			mapOptions.inlineEditingDisabled = quickEdit;
			mmProxy.sendMessage({type: 'map-save-option', args: {'dialog': 'not-required'}});
			content.addEventListener('changed', function () {
				mmProxy.sendMessage({type: 'map-save-option', args: {'dialog': 'show'}});
			});
			iosMapSource.setIdea(content);
			container.domMapWidget(activityLog, mapModel, touchEnabled,  imageInsertController, dragContainer, activeContentResourceManager.getResource, true, mapOptions);
			mapController.loadMap(mapId);

			if (readonly) {
				jQuery('[data-mm-role="ios-menu"]').remove();
				mapModel.setEditingEnabled(false);
			} else {
				mapModel.setEditingEnabled(true);
			}
			if (quickEdit) {

				jQuery('body').addClass('ios-quick-edit-on');
				jQuery('body').removeClass('ios-quick-edit-off');
			} else {
				jQuery('body').removeClass('ios-quick-edit-on');
				jQuery('body').addClass('ios-quick-edit-off');
			}
		}
		else if (command.type === 'contentSaved') {
			autoSave.discardUnsavedChanges();
		}
		else if (command.type === 'keyboardShown') {
			jQuery('body').addClass('ios-keyboardShown');
		}
		else if (command.type === 'keyboardHidden') {
			jQuery('body').removeClass('ios-keyboardShown');
		}
		else if (command.type === 'prepareForSave') {
			var saveScreenOnly = command.args && command.args[0] && command.args[0] === 'save-screen-only';
			mapModel.resetView();
			jQuery('[data-mm-role="ios-menu"]').hide();
			jQuery('[data-mm-role="ios-toolbar"]').hide();
			jQuery('[data-mm-role="ios-context-menu"]').trigger(jQuery.Event('hidePopover'));
			jQuery('[data-mm-role="ios-link-editor"]').trigger(jQuery.Event('hidePopover'));

			window.setTimeout(function () {
				mapModel.scaleDown();
				window.setTimeout(function () {
					var idea = mapModel.getIdea(),
							title = idea.title || 'Mindmup map';
					if (saveScreenOnly) {
						mmProxy.sendMessage({type: 'save-screen'});
					} else {
						resourceCompressor.compress(idea);
						mmProxy.sendMessage({type: 'save-content', args: {'title': title, 'idea': JSON.stringify(idea)}});
					}
				}, 100);
			}, 100);

		}
		else if (command.type === 'mapModel' && command.args && command.args.length > 0) {
			mapModel[command.args[0]].apply(mapModel, command.args.slice(1));
		}
		return completed;
	};
	mmProxy.sendMessage({type: 'loadComplete'});
};