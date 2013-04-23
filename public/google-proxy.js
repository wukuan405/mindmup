(function (namespace) {
	'use strict';
	function Proxy(bridge) {
		this.bridge = bridge;
	}

	Proxy.prototype.push = function (values) {
		this.bridge.postMessage(JSON.stringify({type: '_gaq.push', args: values}), '*');
	};

	function installProxy() {
		var elem = document.getElementById('embedded_google'),
			bridge = elem && elem.contentWindow;
		if (!bridge) {
			return;
		}
		var earlyEvents = [];
		if (namespace._gaq !== undefined) {
			earlyEvents = namespace._gaq;
		}

		namespace._gaq = new Proxy(bridge);
		for (var i in earlyEvents) {
			namespace._gaq.push(earlyEvents[i]);
		}
	}

	window.addEventListener('load', installProxy);
})(window);