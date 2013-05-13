/*global document, window, $, _, jQuery*/
jQuery.fn.saveWidget = function (mapController) {
	'use strict';
	var mapChanged = false,
		repository,
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
		};
	$(window).keydown(function (evt) {
		if (mapChanged && evt.which === 83 && (evt.metaKey || evt.ctrlKey)) {
			mapController.publishMap(repository);
			evt.preventDefault();
		}
	});
	element.find('[data-mm-role=publish]').add('a', element).click(function () {
		mapController.publishMap($(this).attr('data-mm-repository') || repository);
	});
	element.find('a[data-mm-repository]').addClass(function () {
		return 'repo-' + $(this).data('mm-repository');
	});
	mapController.addEventListener('mapLoaded', function (idea, mapId) {
		repository = (mapId && mapId[0]);
		if (repository !== 'g' && repository !== 'o') { repository = 'a'; } /* stupid workaround, this takes care of null, new, default and a...*/
		if (document.location.hash === '#google-drive') {
			repository = 'g';
		}
		element.find('[data-mm-role=currentrepo]').removeClass('repo-a repo-g repo-o').addClass('repo-' + repository);
		idea.addEventListener('changed', mapChangedListener);
		mapChanged = false;
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

	mapController.addEventListener('mapSaved', function () {
		mapChanged = false;
		element.find('[data-mm-role=publish]').text('Save').addClass('btn-primary').attr('disabled', false);
		element.find('.dropdown-toggle').show();
	});
	return element;
};
