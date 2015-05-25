/*global Color, $, describe, it, expect, MM, MAPJS, jasmine, beforeEach, afterEach */
describe('MM.exportIdeas', function () {
	'use strict';

	it('executes a begin callback, then each callback for for each idea, then end callback and then passes toString results to the callback', function () {
		var aggregate = MAPJS.content({id: 1}),
			calls = [],
			begin = function () {
				calls.push('begin');
			},
			each = function () {
				calls.push('each');
			},
			end = function () {
				calls.push('end');
			},
			contents = function () {
				calls.push('contents'); return 'from contents';
			},
			result;
		result = MM.exportIdeas(aggregate, {'each': each, 'begin': begin, 'end': end, 'contents': contents});
		expect(calls).toEqual(['begin', 'each', 'end', 'contents']);
	});
	it('executes a callback for each idea, reverse depth-order, from parent to children', function () {
		var aggregate = MAPJS.content({id: 1, ideas: {1: {id: 2, ideas: {7: {id: 3}}}}}),
			calls = [],
			each = function (idea) {
				calls.push(idea);
			};
		MM.exportIdeas(aggregate, {'each': each, 'contents': function () {} });
		expect(calls[0].id).toBe(1);
		expect(calls[1].id).toBe(2);
		expect(calls[2].id).toBe(3);
	});
	it('passes a level with each callback', function () {
		var aggregate = MAPJS.content({id: 1, ideas: {1: {id: 2, ideas: {1: {id: 3}}}}}),
			each = jasmine.createSpy();
		MM.exportIdeas(aggregate, {'each': each, 'contents': function () {} });
		expect(each).toHaveBeenCalledWith(aggregate, 0);
		expect(each).toHaveBeenCalledWith(aggregate.ideas[1], 1);
		expect(each).toHaveBeenCalledWith(aggregate.ideas[1].ideas[1], 2);
	});
	it('sorts children by key, positive first then negative, by absolute value', function () {
		var aggregate = MAPJS.content({id: 1, title: 'root', ideas: {'-100': {title: '-100'}, '-1': {title: '-1'}, '1': {title: '1'}, '100': {title: '100'}}}),
			calls = [],
			each = function (idea) {
				calls.push(idea.title);
			};
		MM.exportIdeas(aggregate, {'each': each, 'contents': function () {} });
		expect(calls).toEqual(['root', '1', '100', '-1', '-100']);
	});
});
describe('MM.tabSeparatedTextExporter', function () {
	'use strict';
	it('each indents idea with a tab depending on levels and lists the title', function () {
		var tabExporter = new MM.TabSeparatedTextExporter();
		tabExporter.each({title: 'foo'}, 3);
		expect(tabExporter.contents()).toBe('\t\t\tfoo');
	});
	it('separates nodes by a new line', function () {
		var tabExporter = new MM.TabSeparatedTextExporter();
		tabExporter.each({title: 'foo'}, 0);
		tabExporter.each({title: 'bar'}, 0);
		expect(tabExporter.contents()).toBe('foo\nbar');
	});
	it('replaces tabs and newlines by spaces', function () {
		var tabExporter = new MM.TabSeparatedTextExporter();
		tabExporter.each({title: 'f\to\no\ro'}, 0);
		expect(tabExporter.contents()).toBe('f o o o');
	});
});
describe('MM.htmlTableExporter', function () {
	'use strict';
	it('creates a table with ideas as rows', function () {
		var htmlExporter = new MM.HtmlTableExporter(),
			results;
		htmlExporter.begin();
		htmlExporter.each({title: 'foo'}, 0);
		htmlExporter.each({title: 'bar'}, 0);
		results = $(htmlExporter.contents()).filter('table');
		expect(results.find('tr').first().children('td').first().text()).toBe('foo');
		expect(results.find('tr').last().children('td').first().text()).toBe('bar');
	});
	it('adds a UTF header', function () {
		var htmlExporter = new MM.HtmlTableExporter(),
			result;
		htmlExporter.begin();
		result = $(htmlExporter.contents()).filter('meta');
		expect(result.attr('http-equiv')).toBe('Content-Type');
		expect(result.attr('content')).toBe('text/html; charset=utf-8');
	});
	it('indents with colspan if level > 0', function () {
		var htmlExporter = new MM.HtmlTableExporter(),
			cells;
		htmlExporter.begin();
		htmlExporter.each({title: 'foo'}, 4);
		cells = $(htmlExporter.contents()).find('tr').first().children('td');
		expect(cells.length).toBe(2);
		expect(cells.first().html()).toBe('&nbsp;');
		expect(cells.first().attr('colspan')).toEqual('4');
		expect(cells.last().text()).toBe('foo');
	});
	it('sets the background color according to style and a contrast foreground if background style is present', function () {
		/*jslint newcap:true*/
		var htmlExporter = new MM.HtmlTableExporter(),
			cell;
		htmlExporter.begin();
		htmlExporter.each({attr: {style: {background: '#FF0000'}}}, 0);
		cell = $(htmlExporter.contents()).find('tr').first().children('td').first();
		expect(Color(cell.css('background-color'))).toEqual(Color('#FF0000'));
		expect(Color(cell.css('color'))).toEqual(Color(MAPJS.contrastForeground('#FF0000')));
	});
});
describe('MM.exportToHtmlDocument', function () {
	'use strict';
	var result,
		fail = function (message) {
			throw new Error(message);
		};
	beforeEach(function (done) {
		result = false;
		done();
	});
	afterEach(function (done) {
		expect(result).toBeTruthy();
		done();
	});
	it('adds a UTF header', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'z'}))
		.then(
			function (doc) {
				result = $(doc).filter('meta');
				expect(result.attr('http-equiv')).toBe('Content-Type');
				expect(result.attr('content')).toBe('text/html; charset=utf-8');
				done();
			},
			fail.bind(this, 'exportToHtmlDocument failed')
		);
	});
	it('transforms the top level idea into a H1 title', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'z'}))
		.then(
			function (doc) {
				result = $(doc).filter('h1');
				expect(result.length).toBe(1);
				expect(result.text()).toBe('z');
				done();
			},
			fail.bind(this, 'exportToHtmlDocument failed')
		);
	});
	it('transforms the first level subideas into UL/LI list, sorted by child rank', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: { 6 : {title: 'sub6' }, 5: {title: 'sub5'}}})).then(function (doc) {
			result = $(doc).filter('ul');
			expect(result.length).toBe(1);
			expect(result.children().length).toBe(2);
			expect(result.children().first()).toHaveTagName('li');
			expect(result.children().first().text()).toBe('sub5');
			expect(result.children().last()).toHaveTagName('li');
			expect(result.children().last().text()).toBe('sub6');
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
	it('transforms the lower level subideas into UL/LI lists, sorted by child rank, recursively', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: { 1: { title: '2', ideas: { 6 : {title: 'sub6' }, 5: {title: 'sub5'}}}}})).then(function (doc) {
			result = $(doc).filter('ul');
			expect(result.length).toBe(1);
			expect(result.children().length).toBe(1);
			expect(result.children().first()).toHaveTagName('li');
			expect(result.children().first().clone().children().remove().end().text()).toBe('2');// have to do this uglyness to avoid matching subelements
			expect(result.children().first().children('ul').length).toBe(1);
			expect(result.children().first().children('ul').children('li').length).toBe(2);
			expect(result.children().first().children('ul').children('li').first().text()).toBe('sub5');
			expect(result.children().first().children('ul').children('li').last().text()).toBe('sub6');
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
	it('paints the background color according to node', function (done) {
		/*jslint newcap:true*/
		MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: { 6 : {title: 's', attr : { style : { background: '#FF0000' }}}}})).then(function (doc) {
			result = $(doc).filter('ul').children().first();
			expect(Color(result.css('background-color'))).toEqual(Color('#FF0000'));
			expect(Color(result.css('color'))).toEqual(Color(MAPJS.contrastForeground('#FF0000')));
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
	it('converts ideas with URLs into hyperlinks', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: {
			6 : {title: 'zoro http://www.google.com'}
		}})).then(function (doc) {
			result = $(doc).filter('ul').children().first().children().first();
			expect(result).toHaveTagName('a');
			expect(result.attr('href')).toBe('http://www.google.com');
			expect(result.text()).toBe('zoro ');
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
	it('converts ideas with only URLs into hyperlinks using hyperlink as text', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: {
			6 : {title: 'http://www.google.com'}
		}})).then(function (doc) {
			result = $(doc).filter('ul').children().first().children().first();
			expect(result).toHaveTagName('a');
			expect(result.attr('href')).toBe('http://www.google.com');
			expect(result.text()).toBe('http://www.google.com');
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
	it('root idea with URL is converted into a hyperlink', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'zoro http://www.google.com'})).then(function (doc) {
			result = $(doc).filter('h1').children();
			expect(result).toHaveTagName('a');
			expect(result.attr('href')).toBe('http://www.google.com');
			expect(result.text()).toBe('zoro ');
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
	it('root idea with only URL is converted into a hyperlink using link text', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'http://www.google.com'})).then(function (doc) {
			result = $(doc).filter('h1').children();
			expect(result).toHaveTagName('a');
			expect(result.attr('href')).toBe('http://www.google.com');
			expect(result.text()).toBe('http://www.google.com');
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
	it('exports HTML attachments', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'z', ideas: {
			6 : {title: 'z', attr: { attachment : { contentType: 'text/html', content: '<b>Bold</b>' }}}
		}})).then(function (doc) {
			result = $(doc).filter('ul').children().first().children('div').first();
			expect(result.html()).toBe('<b>Bold</b>');
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
	it('exports HTML attachments to root nodes', function (done) {
		MM.exportToHtmlDocument(MAPJS.content({title: 'z', attr: { attachment : { contentType: 'text/html', content: '<b>Bold</b>' }}})).then(function (doc) {
			result = $(doc).filter('div').first();
			expect(result.html()).toBe('<b>Bold</b>');
			done();
		}, fail.bind(this, 'exportToHtmlDocument failed'));
	});
});
describe('MM.exportTableToTabText', function () {
	'use strict';

	it('dumps a table into a tab-separated text file', function () {
		expect(MM.exportTableToText([
				['Name', 'Speed', 'Efficiency'],
				['one', 100, undefined],
				['with values', 1, 2],
				['no values', undefined, undefined],
				['one twenty one', undefined, -1]
			]))
			.toEqual(
				'Name\tSpeed\tEfficiency\n' +
				'one\t100\t\n' +
				'with values\t1\t2\n' +
				'no values\t\t\n' +
				'one twenty one\t\t-1'
			);
	});
	it('replaces newlines and tabs with a single space', function () {
		expect(MM.exportTableToText([
				['Na\tme', 'Sp\t\teed', 'Effic\t\niency'],
				['on\ne', 100, undefined]
			]))
			.toEqual(
				'Na me\tSp  eed\tEffic  iency\n' +
				'on e\t100\t'
			);
	});
});
