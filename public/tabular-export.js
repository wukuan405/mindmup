/*global MM, MAPJS, _, $*/
MM.exportIdeas = function (contentAggregate, exporter) {
	'use strict';
	var traverse = function (iterator, idea, level) {
		level = level || 0;
		iterator(idea, level);
		_.each(idea.sortedSubIdeas(), function (subIdea) {
			traverse(iterator, subIdea, level + 1);
		});
	};
	if (exporter.begin) { exporter.begin(); }
	traverse(exporter.each, contentAggregate);
	if (exporter.end) { exporter.end(); }
	return exporter.contents();
};
MM.TabSeparatedTextExporter = function () {
	'use strict';
	var contents = [];
	this.contents = function () {
		return contents.join("\n");
	};
	this.each = function (idea, level) {
		contents.push(
			_.map(_.range(level), function () {return '\t'; }).join("") + idea.title.replace(/\t|\n|\r/g, ' ')
		);
	};
};
MM.HtmlTableExporter = function () {
	'use strict';
	var result;
	this.begin = function () {
		result = $("<table>").wrap('<div></div>'); /*parent needed for html generation*/
	};
	this.contents = function () {
		return '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"> </head><body>' +
			$(result).parent().html() +
			'</body></html>';
	};
	this.each = function (idea, level) {
		var row = $("<tr>").appendTo(result),
			cell = $("<td>").appendTo(row).text(idea.title);
		if (idea.attr && idea.attr.style && idea.attr.style.background) {
			cell.css('background-color', idea.attr.style.background);
			cell.css('color', MAPJS.contrastForeground(idea.attr.style.background));
		}
		if (level > 0) {
			$("<td>").prependTo(row).html("&nbsp;").attr('colspan', level);
		}
	};
};
MM.exportToHtmlDocument = function (idea) {
	'use strict';
	var result = $("<div>"), /*parent needed for html generation*/
		toList = function (ideaList) {
			var list = $("<ul>");
			_.each(ideaList, function (subIdea) {
				var element = $("<li>").appendTo(list);
				if (MAPJS.URLHelper.containsLink(subIdea.title)) {
					$('<a>').attr('href', MAPJS.URLHelper.getLink(subIdea.title))
							.text(MAPJS.URLHelper.stripLink(subIdea.title) || subIdea.title)
							.appendTo(element);
				} else {
					element.text(subIdea.title);
				}
				if (subIdea.attr && subIdea.attr.style && subIdea.attr.style.background) {
					element.css('background-color', subIdea.attr.style.background);
					element.css('color', MAPJS.contrastForeground(subIdea.attr.style.background));
				}
				if (!_.isEmpty(subIdea.ideas)) {
					toList(subIdea.sortedSubIdeas()).appendTo(element);
				}
			});
			return list;
		};
	$("<h1>").text(idea.title).appendTo(result);
	if (!_.isEmpty(idea.ideas)) {
		toList(idea.sortedSubIdeas()).appendTo(result);
	}
	return '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"> </head><body>' +
		$(result).html() +
		'</body></html>';
};
