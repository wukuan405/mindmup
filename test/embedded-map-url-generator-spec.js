/* global jasmine, describe, it, beforeEach, MM, expect*/
describe('MM.EmbeddedMapUrlGenerator', function () {
	'use strict';
	var underTest, resolveSpy, rejectSpy;
	beforeEach(function () {
		resolveSpy = jasmine.createSpy('resolve');
		rejectSpy = jasmine.createSpy('reject');
		underTest = new MM.EmbeddedMapUrlGenerator({'a': {prefix: 'https://mindmup.awsamazon.com/files/', postfix: '.json'}, 'b': {prefix: 'https://mindmup-gold.awsamazon.com/', remove: 2}});
	});
	describe('buildMapUrl', function () {
		// .buildMapUrl(mapId, prefix, showAuthentication)
		it('should generate for anonymous maps ', function () {
			underTest.buildMapUrl('aldksjfldskfjldskjflfdkj').then(resolveSpy);
			expect(resolveSpy).toHaveBeenCalledWith('https://mindmup.awsamazon.com/files/aldksjfldskfjldskjflfdkj.json');
		});
		it('should generate for public gold maps ', function () {
			underTest.buildMapUrl('b/jimbo/ldksjfldskfjldskjflfdkj.mup').then(resolveSpy);
			expect(resolveSpy).toHaveBeenCalledWith('https://mindmup-gold.awsamazon.com/jimbo/ldksjfldskfjldskjflfdkj.mup');
		});
		it('should reject unrecognised maps', function () {
			underTest.buildMapUrl('p/jimbo/ldksjfldskfjldskjflfdkj.mup').fail(rejectSpy);
			expect(rejectSpy).toHaveBeenCalled();
		});
	});
});
