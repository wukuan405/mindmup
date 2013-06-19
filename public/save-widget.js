/*global window, $, _, jQuery*/
jQuery.fn.saveWidget = function (mapController) {
	'use strict';
	var mapChanged = false,
		repository,
		autoSave,
		element = jQuery(this),
		resetSaveButton = function () {
			if (element.find('button[data-mm-role=publish]').attr('disabled')) {
				element.find('button[data-mm-role=publish]').text('Save').addClass('btn-primary').removeAttr('disabled');
				element.find('.dropdown-toggle').removeAttr('disabled');
			}
		},
		mapChangedListener = function () {
			mapChanged = true;
			resetSaveButton();
		},
		resetSaveButtonEvents = ['mapSavingFailed', 'mapSavingUnAuthorized', 'authorisationFailed', 'authRequired'],
		setDefaultRepo = function (mapId) {
			var validrepos = 'aogc';
			repository = (mapId && mapId[0]);
			if (/^new-/.test(mapId) && mapId.length > 4) {
				repository = mapId[4];
			}
			if (!_.contains(validrepos, repository)) {
				repository = validrepos[0];
			}
			element.find('[data-mm-role=currentrepo]').removeClass(
				_.map(validrepos, function (x) { return 'repo-' + x + ' '; }).join('')
			).addClass('repo repo-' + repository);
		};
	$(window).keydown(function (evt) {
		if (evt.which === 83 && (evt.metaKey || evt.ctrlKey)) {
			if (!autoSave && mapChanged) {
				mapController.publishMap(repository);
			}
			evt.preventDefault();
		}
	});
	element.find('[data-mm-role=publish]').add('a[data-mm-repository]', element).click(function () {
		mapController.publishMap($(this).attr('data-mm-repository') || repository);
	});
	element.find('a[data-mm-repository]').addClass(function () {
		return 'repo repo-' + $(this).data('mm-repository');
	});
	mapController.addEventListener('mapLoaded', function (mapId, idea, properties) {
		autoSave = properties.autoSave;
		if (!autoSave) {
			idea.addEventListener('changed', mapChangedListener);
		}
	});
	mapController.addEventListener('mapSaving', function () {
		element.find('button[data-mm-role=publish]')
			.html('<i class="icon-spinner icon-spin"></i>&nbsp;Saving')
			.attr('disabled', true)
			.removeClass('btn-primary');
		element.find('.dropdown-toggle').attr('disabled', true);
	});
	_.each(resetSaveButtonEvents, function (eventName) {
		mapController.addEventListener(eventName, resetSaveButton);
	});

	mapController.addEventListener('mapLoaded mapSaved', function (mapId) {
		setDefaultRepo(mapId);
		mapChanged = false;
		element.find('button[data-mm-role=publish]').text('Save').attr('disabled', true).removeClass('btn-primary');
		element.find('.dropdown-toggle').removeAttr('disabled');
	});
	return element;
};
