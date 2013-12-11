/*jslint nomen: true*/
/*global _gaq, document, jQuery, MM, MAPJS, window*/
MM.main = function (config) {
	'use strict';
	var getStorage = function () {
			try {
				window.localStorage.setItem('testkey', 'testval');
				if (window.localStorage.getItem('testkey') === 'testval') {

					return window.localStorage;
				}
			} catch (e) {
			}
			return {
				fake: true,
				getItem: function (key) { return this[key]; },
				setItem: function (key, val) { this[key] = val; },
				removeItem: function (key) { delete this[key]; }
			};
		},
		browserStorage = getStorage(),
		mapModelAnalytics = false,
		setupTracking = function (activityLog, jotForm, mapModel) {
			activityLog.addEventListener('log', function () { _gaq.push(['_trackEvent'].concat(Array.prototype.slice.call(arguments, 0, 3))); });
			activityLog.addEventListener('error', function (message) {
				jotForm.sendError(message, activityLog.getLog());
			});
			if (mapModelAnalytics) {
				mapModel.addEventListener('analytic', activityLog.log);
			}
		};
	window._gaq = window._gaq || [];

	window._gaq = [['_setAccount', config.googleAnalyticsAccount],
		['_setCustomVar', 1, 'User Cohort', config.userCohort, 1],
		['_setCustomVar', 2, 'Active Extensions', browserStorage['active-extensions'], 1],
		['_trackPageview']
			].concat(window._gaq);
	jQuery(function () {
		var activityLog = new MM.ActivityLog(10000),
			oldShowPalette,
			alert = new MM.Alert(),
			modalConfirm = jQuery('#modalConfirm').modalConfirmWidget(),
			objectStorage = MM.jsonStorage(browserStorage),
			jotForm = new MM.JotForm(jQuery('#modalFeedback form'), alert),
			ajaxPublishingConfigGenerator = new MM.AjaxPublishingConfigGenerator(config.s3Url, config.publishingConfigUrl, config.s3Folder),
			pdfPublishingConfigGenerator = new MM.AjaxPublishingConfigGenerator('http://' + config.pdfBucket + '.s3.amazonaws.com/', 'layoutPublishingConfig?format=pdf'),
			goldLicenseManager = new MM.GoldLicenseManager(objectStorage, 'licenseKey', config.goldSignatureUrl),
			s3PrivateGoldAdapter = MM.GoldStorageAdapter(new MM.S3Adapter(new MM.GoldPublishingConfigGenerator(goldLicenseManager, modalConfirm, true, 'b'), 'p', 'MindMup Gold Private', true), goldLicenseManager),
			s3GoldAdapter = MM.GoldStorageAdapter(new MM.S3Adapter(new MM.GoldPublishingConfigGenerator(goldLicenseManager, modalConfirm, false, 'p'), 'b', 'MindMup Gold Public'), goldLicenseManager, 'p'),
			s3Adapter = new MM.S3Adapter(ajaxPublishingConfigGenerator, 'a', 'S3_CORS'),
			googleDriveAdapter = new MM.GoogleDriveAdapter(config.googleAppId, config.googleClientId, config.googleApiKey, config.networkTimeoutMillis, 'application/json'),
			offlineMapStorage = new MM.OfflineMapStorage(objectStorage, 'offline'),
			offlineAdapter = new MM.OfflineAdapter(offlineMapStorage),
			mapController = new MM.MapController([
				new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(s3Adapter)),
				new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(s3GoldAdapter)),
				new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(s3PrivateGoldAdapter)),
				new MM.RetriableMapSourceDecorator(new MM.FileSystemMapSource(googleDriveAdapter)),
				new MM.FileSystemMapSource(offlineAdapter),
				new MM.EmbeddedMapSource()
			]),
			navigation = MM.navigation(browserStorage, mapController),
			mapModel = new MAPJS.MapModel(MAPJS.KineticMediator.layoutCalculator, [''], ['']),
			layoutS3Adapter = new MM.S3Adapter(pdfPublishingConfigGenerator, undefined, 'S3_LAYOUT_EXPORT'),
			layoutExportController = new MM.LayoutExportController(mapModel, layoutS3Adapter, new MM.S3FilePoller(config.pdfBucket, 'out/', '.pdf', 2000, 20000), activityLog),
			iconEditor = new MM.iconEditor(mapModel),
			mapBookmarks = new MM.Bookmark(mapController, objectStorage, 'created-maps'),
			autoSave = new MM.AutoSave(mapController, objectStorage, alert),
			extensions = new MM.Extensions(browserStorage, 'active-extensions', config, {
				'googleDriveAdapter': googleDriveAdapter,
				'alert': alert,
				'mapController': mapController,
				'activityLog': activityLog,
				'mapModel': mapModel,
				'container': jQuery('#container'),
				'iconEditor': iconEditor
			}),
			loadWidgets = function () {
				if (!config.isTouch) {
					jQuery('[rel=tooltip]').tooltip();
				}
				jQuery('body').mapStatusWidget(mapController);
				jQuery('#container').mapWidget(activityLog, mapModel, config.isTouch, false);
				jQuery('#welcome_message[data-message]').welcomeMessageWidget(activityLog);
				jQuery('#topbar').mapToolbarWidget(mapModel);

				oldShowPalette = jQuery.fn.colorPicker.showPalette;
				jQuery.fn.colorPicker.showPalette = function (palette) {
					oldShowPalette(palette);
					if (palette.hasClass('topbar-color-picker')) {
						palette.css('top', jQuery('#topbar').outerHeight());
					}
				};
				jQuery('#modalFeedback').feedbackWidget(jotForm, activityLog);
				jQuery('#modalVote').voteWidget(activityLog, alert);
				jQuery('#toolbarEdit').mapToolbarWidget(mapModel);
				jQuery('#floating-toolbar').floatingToolbarWidget();
				jQuery('#listBookmarks').bookmarkWidget(mapBookmarks, alert, mapController);
				jQuery(document).titleUpdateWidget(mapController);
				jQuery('[data-mm-role=share]').shareWidget();
				jQuery('#modalShareEmail').shareEmailWidget();
				jQuery('[data-mm-role=share-google]').googleShareWidget(mapController, googleDriveAdapter);
				jQuery('[data-mm-role=share]').add('[data-mm-role=short-url]').urlShortenerWidget(config.googleApiKey, activityLog, mapController, config.baseUrl);
				jQuery('#modalImport').importWidget(activityLog, mapController);
				jQuery('[data-mm-role=save]').saveWidget(mapController);
				jQuery('[data-mm-role="toggle-class"]').toggleClassWidget();
				jQuery('[data-mm-role="remote-export"]').remoteExportWidget(mapController, alert);
				jQuery('[data-mm-role=layout-export]').layoutExportWidget(layoutExportController, modalConfirm, alert);
				jQuery('[data-mm-role~=google-drive-open]').googleDriveOpenWidget(googleDriveAdapter, mapController, modalConfirm, activityLog);
				jQuery('#modalLocalStorageOpen').localStorageOpenWidget(offlineMapStorage, mapController);
				jQuery('#modalGoldStorageOpen').goldStorageOpenWidget(s3GoldAdapter, mapController);
				jQuery('body')
					.commandLineWidget('Shift+Space Ctrl+Space', mapModel);
				jQuery('#modalAttachmentEditor').attachmentEditorWidget(mapModel, config.isTouch);
				jQuery('#modalAutoSave').autoSaveWidget(autoSave);
				jQuery('#modalEmbedMap').embedMapWidget(mapController);
				jQuery('#linkEditWidget').linkEditWidget(mapModel);
				jQuery('#modalExtensions').extensionsWidget(extensions, mapController, alert);
				jQuery('#nodeContextMenu').contextMenuWidget(mapModel).mapToolbarWidget(mapModel);
				jQuery('.dropdown-submenu>a').click(function () { return false; });
				jQuery('[data-category]').trackingWidget(activityLog);
				jQuery('.modal')
					.on('show', mapModel.setInputEnabled.bind(mapModel, false))
					.on('hide', mapModel.setInputEnabled.bind(mapModel, true));
				jQuery('#modalKeyActions').keyActionsWidget();
				jQuery('#topbar .updateStyle').attr('data-mm-align', 'top').colorPicker();
				jQuery('.colorPicker-palette').addClass('topbar-color-picker');
				jQuery('.updateStyle[data-mm-align!=top]').colorPicker();
				jQuery('.colorPicker-picker').parent('a,button').click(function (e) { if (e.target === this) {jQuery(this).find('.colorPicker-picker').click(); } });
				jQuery('#modalGoldLicense').goldLicenseEntryWidget(goldLicenseManager, activityLog);
				jQuery('#modalIconEdit').iconEditorWidget(iconEditor);
			};
		jQuery.fn.colorPicker.defaults.colors = [
			'000000', '993300', '333300', '000080', '333399', '333333', '800000', 'FF6600',
			'808000', '008000', '008080', '0000FF', '666699', '808080', 'FF0000', 'FF9900',
			'99CC00', '339966', '33CCCC', '3366FF', '800080', '999999', 'FF00FF', 'FFCC00',
			'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0', 'FF99CC', 'FFCC99',
			'FFFF99', 'CCFFFF', 'FFFFFF', 'transparent'
		];
		jQuery.fn.colorPicker.defaults.pickerDefault = 'transparent';
		config.isTouch = jQuery('body').hasClass('ios') || jQuery('body').hasClass('android');
		MM.OfflineMapStorageBookmarks(offlineMapStorage, mapBookmarks);
		jQuery.support.cors = true;
		setupTracking(activityLog, jotForm, mapModel);
		jQuery('body').classCachingWidget('cached-classes', browserStorage);
		MM.MapController.activityTracking(mapController, activityLog);
		MM.MapController.alerts(mapController, alert, modalConfirm);
		mapController.addEventListener('mapLoaded', function (mapId, idea) {
			mapModel.setIdea(idea);
		});
		if (browserStorage.fake) {
			alert.show('Browser storage unavailable!', 'You might be running the app in private mode or have no browser storage - some features of this application will not work fully.', 'warning');
			activityLog.log('Warning', 'Local storage not available');
		}
		jQuery('#topbar').alertWidget(alert);
		if (window.mmtimestamp) {
			window.mmtimestamp.log('mm initialized');
		}
		extensions.load(navigation.initialMapId()).then(function () {
			if (window.mmtimestamp) {
				window.mmtimestamp.log('extensions loaded');
			}
			jQuery('[data-mm-clone]').each(function () {
				var element = jQuery(this),
					toClone = jQuery(element.data('mm-clone'));
				toClone.children().clone(true).appendTo(element);
				element.attr('data-mm-role', toClone.attr('data-mm-role'));
			});
			loadWidgets();
			if (window.mmtimestamp) {
				window.mmtimestamp.log('ui loaded');
			}
			if (!navigation.loadInitial()) {
				jQuery('#logo-img').click();
			}
		});
	});

};
