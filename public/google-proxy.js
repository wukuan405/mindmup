/*global MM, _*/

MM.googleProxyInstall = function (namespace, targetSelector) {
	'use strict';
	var stub = new MM.DeferredStub(targetSelector),
		earlyCalls = namespace._gaq;
	namespace._gaq = new MM.GaqStub(stub);
	_.each(earlyCalls, function (args) {namespace._gaq.push(args); });
	namespace.addEventListener('load', stub.targetLoaded);
};

MM.GaqStub = function (deferredStub) {
	'use strict';
	var self = this;
	return MM.deferredStubProxy(self, '_gaq', deferredStub, ['push']);
};

MM.RepositoryAdapterStub = function (name, prefix, deferredStub) {
	'use strict';
	var self = this;
	self.recognises = function (mapId) {
		return mapId && mapId[0] === prefix;
	};
	return MM.deferredStubProxy(self, name, deferredStub, ['loadMap', 'ready',  'retrieveAllFiles', 'saveMap']);
};