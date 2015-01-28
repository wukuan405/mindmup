/*global describe, it, beforeEach, afterEach, jQuery, expect, MM */
describe('AtlasPrepopulateWidget', function () {
	'use strict';
	var underTest, activeContentListener, content,
			template = '<div>' +
									'<form data-mm-role="atlas-metadata">' +
									'<input name="title" placeholder="old title"/>' +
									'<input name="description" placeholder="old description"/>' +
									'<input name="slug" placeholder="old slug"/>' +
									'</form>' +
								'</div>',
			field = function (name) {
				return underTest.find('input[name=' + name + ']');
			},
			truncFunction, sanitizeFunction;
	beforeEach(function () {
		content = {
			title: 'map title'
		};
		truncFunction = function (x, length) {
			return 'truncated ' + x  + ' ' + length;
		};
		sanitizeFunction = function (x) {
			return x.replace(/ /g, '_');
		};
		activeContentListener = { getActiveContent: function () {
				return content;
			}
		};
		underTest = jQuery(template).appendTo('body').atlasPrepopulationWidget(activeContentListener, 15, 30, truncFunction, sanitizeFunction);
	});
	afterEach(function () {
		underTest.remove();
	});
	it('ignores shown events on sub-elements', function () {
		field('title').trigger('show');
		expect(field('title').attr('placeholder')).toEqual('old title');

	});
	describe('when modal is shown', function () {
		it('fills in title by truncating the title', function () {
			underTest.trigger('show');
			expect(field('title').attr('placeholder')).toEqual('truncated map title 15');
		});
		it('fills in description by "MindMup mind map:" and truncating', function () {
			underTest.trigger('show');
			expect(field('description').attr('placeholder')).toEqual('truncated MindMup mind map: map title 30');
		});
		it('fills in slug by sanitising the title', function () {
			underTest.trigger('show');
			expect(field('slug').attr('placeholder')).toEqual('truncated_map_title_15');
		});
		it('works even if form has multiple roles', function () {
			underTest.find('form').attr('data-mm-role', 'atlas-metadata export-parameters');
			underTest.trigger('show');
			expect(field('title').attr('placeholder')).toEqual('truncated map title 15');
		});
		it('does not touch fields outside data-mm-role=atlas-metadata forms', function () {
			underTest.find('form').attr('data-mm-role', 'export-parameters');
			underTest.trigger('show');
			expect(field('title').attr('placeholder')).toEqual('old title');
		});
	});
});
describe('MM.AtlasUtil', function () {
	'use strict';
	describe('truncate', function () {
		/*
		it('cuts on a sentence limit if there is one', function () {
			expect(MM.AtlasUtil.truncate('Who goes there? I go! But not someone else', 28)).toEqual('Who goes there? I go!');
		});
		it('cuts on a word limit if there is no sentence', function () {
			expect(MM.AtlasUtil.truncate('Who goes there- I go- But not someone else', 33)).toEqual('Who goes there- I go- But not');
		};
		it('cuts on a character if there is no word', function () {
			expect(MM.AtlasUtil.truncate('Whoxgoesxthere-xIxgo-xButxnotxsomeone else', 33)).toEqual('Who goes there- I go- But not');
		});
		*/
	});
	describe('sanitize', function () {
		it('cleans up problematic characters for URLs', function () {
			expect(MM.AtlasUtil.sanitize('\\/:\'*?"<>|.')).toEqual('map');
		});
		it('replaces spaces with underscores', function () {
			expect(MM.AtlasUtil.sanitize('who is this\nhere\tthere')).toEqual('who_is_this_here_there');
		});
		it('joins multiple space replacements into a single one', function () {
			expect(MM.AtlasUtil.sanitize('who is this\n here\t\t\nthere')).toEqual('who_is_this_here_there');
		});
		it('lowercases text', function () {
			expect(MM.AtlasUtil.sanitize('How Do You Do')).toEqual('how_do_you_do');
		});
		it('trims text', function () {
			expect(MM.AtlasUtil.sanitize('How Do You Do ')).toEqual('how_do_you_do_');
		});
		it('truncates at 100', function () {
			var text = '';
			while (text.length < 120) {
				text += 'How Do You Do';
			}
			expect(MM.AtlasUtil.sanitize(text).length).toEqual(100);
		});
	});
});
