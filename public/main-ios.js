/*jslint nomen: true*/
/*global MM, jQuery, MAPJS, console, window*/
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
					var args = ['_trackEvent'].concat(Array.prototype.slice.call(arguments, 0, 3));
					mmProxy.sendMessage({type: 'log', args: args});
				});
				activityLog.addEventListener('error', function (message) {
					var args = [message, activityLog.getLog()];
					mmProxy.sendMessage({type: 'error', args: args});
				});
				activityLog.addEventListener('timer', function (category, action, time) {
					var args = ['_trackEvent', category,  action, '', time];
					mmProxy.sendMessage({type: 'error', args: args});
				});
				if (mapModelAnalytics) {
					mapModel.addEventListener('analytic', activityLog.log);
				}
			},
			container = jQuery('#container'),
			iosMapSource = new MM.IOSMapSource(MAPJS.content(MM.IOS.defaultMap())),
			mapController = new MM.MapController([iosMapSource]),
			activeContentListener = new MM.ActiveContentListener(mapController),
			resourcePrefix = 'internal',
			resourceCompressor = new MM.ResourceCompressor(resourcePrefix),
			activeContentResourceManager = new MM.ActiveContentResourceManager(activeContentListener, resourcePrefix),
			imageInsertController = new MAPJS.ImageInsertController(config.corsProxyUrl, activeContentResourceManager.storeResource),
			mapModel = new MAPJS.MapModel(MAPJS.DOMRender.layoutCalculator, []),
			iconEditor = new MM.iconEditor(mapModel, activeContentResourceManager),

			showMap = function () {
				container.domMapWidget(activityLog, mapModel, true,  imageInsertController, jQuery('#splittable'), activeContentResourceManager.getResource, true);
				mapController.loadMap('ios');
			},
			// autoLoadTimeout = window.setTimeout(showMap, 10000),
			mapModelAnalytics = false;
	mapController.addEventListener('mapLoaded', function (mapId, idea) {
		idea.setConfiguration(config.activeContentConfiguration);
		mapModel.setIdea(idea);
		mmProxy.sendMessage({type: 'mapLoaded'});
	});
	iconEditor.addEventListener('iconEditRequested', function (icon) {
		mmProxy.sendMessage({type: 'showMessage', args: {'type': 'info', 'message': 'Loading icon editor, please wait...'}});
		//{"url":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAvcAAAU2CAYAAAARbJkkAAAKQWlDQ…OiDfxZekGnSRFYbAiMjCD8m/+IPQqusIWTF5t/S92f/w+TMMOwHIKx1wAAAABJRU5ErkJggg==","width":200,"height":351,"position":"top"}
		icon = icon || {};
		mmProxy.sendMessage({type: 'iconEditRequested', args: icon});
	});
	setupTracking(activityLog, mapModel, mapModelAnalytics);
	MM.MapController.activityTracking(mapController, activityLog);
	jQuery('[data-mm-role~="ios-modal"]').iosModalWidget();
	jQuery('[data-mm-role~="ios-menu"]').iosMenuWidget(mapModel, mmProxy);
	jQuery('[data-mm-role="ios-context-menu"]').iosPopoverMenuWidget().iosContextMenuWidget(mapModel, jQuery('[data-mm-menu-role~="context-menu"]'));
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
		if (command.type === 'ping') {
			mmProxy.sendMessage(command);
		}
		else if (command.type === 'setViewport') {
			jQuery('meta[name=viewport]').attr('content', command.args);
			window.setTimeout(function	() {
				if (mapModel && mapModel.resetView && mapModel.getIdea()) {
					mapModel.centerOnNode(mapModel.getSelectedNodeId());
				}
			}, 100);
		}
		else if (command.type === 'mapModel:setIcon') {
			var result = command.args && command.args[0];
			if (result) {
				mapModel.setIcon('icon-editor', activeContentResourceManager.storeResource(result.url), result.width, result.height, result.position);
			} else {
				mapModel.setIcon(false);
			}
		}
		else if (command.type === 'loadMap') {
			// window.clearTimeout(autoLoadTimeout);
			var newIdea = command.args[0],
					content = MAPJS.content(newIdea);
			// resourceCompressor.compress(content);
			iosMapSource.setIdea(content);
			showMap();
		}
		else if (command.type === 'keyboardShown') {
			jQuery('[data-mm-role="ios-menu"]').hide();
		}
		else if (command.type === 'keyboardHidden') {
			jQuery('[data-mm-role="ios-menu"]').show();
		}
		else if (command.type === 'prepareForSave') {
			mapModel.resetView();
			jQuery('[data-mm-role="ios-menu"]').hide();
			jQuery('[data-mm-role="ios-toolbar"]').hide();
			window.setTimeout(function () {
				mapModel.scaleDown();
				window.setTimeout(function () {
					var idea = mapModel.getIdea(),
							title = idea.title || 'Mindmup map';
					resourceCompressor.compress(idea);
					mmProxy.sendMessage({type: 'save-content', args: {'title': title, 'idea': JSON.stringify(idea)}});
				}, 100);
			}, 100);

		}
		else if (command.type === 'mapModel' && command.args && command.args.length > 0) {
			mapModel[command.args[0]].apply(mapModel, command.args.slice(1));
		}
		return {'completed': true, 'command': command.type};
	};
	mapModel.addEventListener('changed', function () {
		var args = Array.prototype.slice.call(arguments, 0);
		mmProxy.sendMessage({type: 'changed', args: args});
	});
	mmProxy.sendMessage({type: 'loadComplete'});
};