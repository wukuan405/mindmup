/*global $, _*/
$.fn.searchWidget = function (keyBinding, mapModel) {
	'use strict';
	var element = this,
		show = function () {
			if (!mapModel.getInputEnabled()) {
				return;
			}
			var input,
				hide = function () {
					if (input) {
						input.remove();
					}
					mapModel.setInputEnabled(true);
				},
				commit = function (value) {
					var id = value.substring(0, value.indexOf(':'));
					hide();
					mapModel.centerOnNode(id);
				};
			mapModel.setInputEnabled(false);
			input  = $('<input type="text" autocomplete="off" placeholder="Type a part of the node title" class="commandline">')
				.appendTo(element)
				.focus()
				.blur(hide)
				.keyup('Esc', hide)
				.typeahead({
					source: function (query) {
						return _.map(mapModel.search(query), function (i) {
							return i.id + ':' + i.title;
						});
					},
					updater: commit,

					highlighter: function (item) {
						return item.replace(/[^:]+:/, '');
					}

				});
		};
	element.keydown(keyBinding, function (e) {
		show();
		e.preventDefault();
		e.stopPropagation();
	}).find('[data-mm-role=show-map-search]').click(show);
	return element;
};
