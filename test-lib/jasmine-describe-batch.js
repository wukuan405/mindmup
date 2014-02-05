/*global describe, it, _*/
(function describeBatch() {
	'use strict';
	var oldDescribe = describe;
	describe = function () {
		var optionalBatch, parameterizedSpec;
		if (arguments.length === 2) {
			return oldDescribe.apply(this, arguments);
		}
		optionalBatch = arguments[1];
		if (arguments.length === 3) {
			parameterizedSpec = arguments[2];
			if (Array.isArray(optionalBatch)) {
				oldDescribe.call(this, arguments[0], function () {
					optionalBatch.forEach(function (args) {
						var specArgs = args.slice(1);
						it.call(this, args[0], function () {
							parameterizedSpec.apply(this, specArgs);
						});
					});
				});
			}  else {
				oldDescribe.call(this, arguments[0], function () {
					_.each(optionalBatch, function (specArgs, desc) {
						it.call(this, desc, function () {
							parameterizedSpec.apply(this, specArgs);
						});
					});
				});
			}
		}
	};
}());
