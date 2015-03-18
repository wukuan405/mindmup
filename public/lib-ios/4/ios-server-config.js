/*global MM, observable, _*/

MM.IOS.ServerConfig = function (storage, defaultConfig) {
	'use strict';
	var self = observable(this);
	self.handlesCommand = function (command) {
		return command && command.type && command.type === 'config:set';
	};
	self.handleCommand = function (command) {
		var config = command && command.args && command.args[0],
			stored = storage.getItem('ios-config');
		if (!config) {
			config = undefined;
		}
		if (_.isEqual(config, stored)) {
			return;
		}
		storage.setItem('ios-config', config);
		self.dispatchEvent(command.type, config);
	};
	self.valueForKey = function (key) {
		var stored = storage.getItem('ios-config'),
			val =  stored && stored[key];
		if (val) {
			return val;
		} else if (defaultConfig) {
			return defaultConfig[key];
		}
	};
};
