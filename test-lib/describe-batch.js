/*global describe, it, _, expect*/
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
describe('batch describe', function () {
	'use strict';
	describe('cases as object properties', {
		'first': [1, 2],
		'second': [2, 4]
	}, function (num, twice) {
		expect(twice).toEqual(num * 2);
	});
});
