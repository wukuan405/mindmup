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

MM.main = function (config) {
	'use strict';
	console.log('MM.main');
	var mmProxy = new MM.IOS.Proxy('mmproxy'),
			container = jQuery('#container'),
			horizontalMargin = 20,
			verticalMargin = 20,
			mapjson = (MM.IOS.mapToLoad && MM.IOS.mapToLoad()) || MM.IOS.defaultMap(),
			idea = MAPJS.content(mapjson),
			mapController = new MM.MapController([new MM.IOSMapSource(idea)]),
			activeContentListener = new MM.ActiveContentListener(mapController),
			activeContentResourceManager = new MM.ActiveContentResourceManager(activeContentListener, 'internal'),
			imageInsertController = new MAPJS.ImageInsertController(config.corsProxyUrl, activeContentResourceManager.storeResource),
			mapModel = new MAPJS.MapModel(MAPJS.DOMRender.layoutCalculator, []),
			iconEditor = new MM.iconEditor(mapModel, activeContentResourceManager),
			showMap = function () {
				container.domMapWidget(console, mapModel, true,  imageInsertController, jQuery('#splittable'), activeContentResourceManager.getResource);
				MAPJS.DOMRender.stageMargin = {top: horizontalMargin, left: verticalMargin, bottom: horizontalMargin, right: verticalMargin};
				MAPJS.DOMRender.stageVisibilityMargin = {top: 20, left: 20, bottom: 20, right: 20};
				mapController.loadMap('ios');
			};
	mapController.addEventListener('mapLoaded', function (mapId, idea) {
		idea.setConfiguration(config.activeContentConfiguration);
		mapModel.setIdea(idea);
	});


	jQuery('[data-mm-role~="ios-node-picture-config"]').iconEditorWidget(iconEditor, config.corsProxyUrl);
	jQuery('[data-mm-role~="ios-modal"]').iosModalWidget();
	jQuery('[data-mm-role="ios-menu"]').iosMenuWidget(mapModel, mmProxy);
	jQuery('[data-mm-role~="ios-node-background-color-picker"]').iosBackgroundColorWidget(mapModel, [
			'000000', '993300', '333300', '000080', '333399', '333333', '800000', 'FF6600',
			'808000', '008000', '008080', '0000FF', '666699', '808080', 'FF0000', 'FF9900',
			'99CC00', '339966', '33CCCC', '3366FF', '800080', '999999', 'FF00FF', 'FFCC00',
			'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0', 'FF99CC', 'FFCC99',
			'FFFF99', 'CCFFFF', 'FFFFFF', 'transparent'
		]);
	window.setTimeout(showMap, 250);
	mmProxy.onCommand(function (command) {
		// var commandText = JSON.stringify(command) || command;
		if (command.type === 'ping') {
			mmProxy.sendMessage(command);
		}
		else if (command.type === 'setViewport') {
			jQuery('meta[name=viewport]').attr('content', command.args);
			mapModel.resetView('ios');
		}
		else if (command.type === 'keyboardShown') {
			jQuery('[data-mm-role="ios-menu"]').hide();
		}
		else if (command.type === 'keyboardHidden') {
			jQuery('[data-mm-role="ios-menu"]').show();
		}
		else if (command.type === 'prepareForSave') {
			jQuery('[data-mm-role="ios-menu"]').hide();
			jQuery('[data-mm-role="ios-toolbar"]').hide();
			window.setTimeout(function () {
				mmProxy.sendMessage({type: 'save-content', args: {'idea': JSON.stringify(idea)}});
			}, 100);

		}
		else if (command.type === 'mapModel' && command.args && command.args.length > 0) {
			mapModel[command.args[0]].apply(mapModel, command.args.slice(1));
		}
	});
	mapModel.addEventListener('analytic', function () {
		var args = Array.prototype.slice.call(arguments, 0);
		mmProxy.sendMessage({type: 'analytic', args: args});
	});

	mapModel.addEventListener('changed', function () {
		var args = Array.prototype.slice.call(arguments, 0);
		mmProxy.sendMessage({type: 'changed', args: args});
	});
	mapModel.addEventListener('nodeEditRequested', function () {
		var args = Array.prototype.slice.call(arguments, 0);
		mmProxy.sendMessage({type: 'mapModel.nodeEditRequested', args: args});
	});
	mmProxy.sendMessage({type: 'loadComplete'});
};