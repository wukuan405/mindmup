/*global window, $, _, jQuery*/
jQuery.fn.saveWidget = function (mapController) {
	'use strict';
	var mapChanged = false,
		repository,
		autoSave,
		mapChangedListener = function () {
			mapChanged = true;
		},
		element = jQuery(this),
		resetSaveButtonEvents = ['mapSavingFailed', 'mapSavingUnAuthorized', 'authorisationFailed', 'authRequired'],
		resetSaveButton = function () {
			if (element.find('[data-mm-role=publish]').attr('disabled')) {
				element.find('[data-mm-role=publish]').text('Save').addClass('btn-primary').attr('disabled', false);
				element.find('.dropdown-toggle').show();
			}
		},
		setDefaultRepo = function (mapId) {
			var validrepos = 'aog';
			repository = (mapId && mapId[0]);
			if (!_.contains(validrepos, repository)) {
				repository = validrepos[0];
			}
			if (mapId === 'new-g') {
				repository = 'g';
			}
			element.find('[data-mm-role=currentrepo]').removeClass(
				_.map(validrepos, function (x) { return 'repo-' + x + ' '; }).join('')
			).addClass('repo repo-' + repository);
		};
	$(window).keydown(function (evt) {
		if (evt.which === 83 && (evt.metaKey || evt.ctrlKey)) {
			if (!autoSave) {
				mapController.publishMap(repository);
			}
			evt.preventDefault();
		}
	});
	element.find('[data-mm-role=publish]').add('a', element).click(function () {
		mapController.publishMap($(this).attr('data-mm-repository') || repository);
	});
	element.find('a[data-mm-repository]').addClass(function () {
		return 'repo repo-' + $(this).data('mm-repository');
	});
	mapController.addEventListener('mapLoaded', function (mapId, idea, properties) {
		autoSave = properties.autoSave;
		idea.addEventListener('changed', mapChangedListener);
	});
	mapController.addEventListener('mapSaving', function () {
		element.find('[data-mm-role=publish]')
			.html('<i class="icon-spinner icon-spin"></i>&nbsp;Saving')
			.removeClass('btn-primary')
			.attr('disabled', true);
		element.find('.dropdown-toggle').hide();
	});
	_.each(resetSaveButtonEvents, function (eventName) {
		mapController.addEventListener(eventName, resetSaveButton);
	});

	mapController.addEventListener('mapLoaded mapSaved', function (mapId) {
		setDefaultRepo(mapId);
		mapChanged = false;
		element.find('[data-mm-role=publish]').text('Save').addClass('btn-primary').attr('disabled', false);
		element.find('.dropdown-toggle').show();
	});
	return element;
};
