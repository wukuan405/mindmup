/*jslint nomen: true*/
/*global MM, jQuery, MAPJS, console, window*/

MM.main = function () {
	'use strict';
	var mmProxy = new MM.IOS.Proxy('mmproxy'),
			container = jQuery('#container'),
			horizontalMargin = 0,
			verticalMargin = 0,
			mapjson = MM.IOS.mapToLoad && MM.IOS.mapToLoad() || MM.IOS.defaultMap(),
			idea = MAPJS.content(mapjson),
			imageInsertController = new MAPJS.ImageInsertController('http://localhost:4999?u='),
			mapModel = new MAPJS.MapModel(MAPJS.DOMRender.layoutCalculator, []),
			showMap = function () {
				container.domMapWidget(console, mapModel, true, imageInsertController);
				MAPJS.DOMRender.stageMargin = {top: horizontalMargin, left: verticalMargin, bottom: horizontalMargin, right: verticalMargin};
				MAPJS.DOMRender.stageVisibilityMargin = {top: 20, left: 0, bottom: 0, right: 0};
				mapModel.setIdea(idea);
			};
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
		else if (command.type === 'getContent') {
			mmProxy.sendMessage({type: 'content', args: {'idea': JSON.stringify(idea)}});
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