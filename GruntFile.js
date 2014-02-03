/*global module*/
module.exports = function (grunt) {
	'use strict';
	grunt.initConfig({
		jasmine: {
			all: {
				src: [
					'public/alert.js',
					'public/activity-log.js',
					'public/class-caching-widget.js',
					'public/feedback.js',
					'public/bookmark.js',
					'public/offline-adapter.js',
					'public/map-controller.js',
					'public/background-upload-widget.js',
					'public/toggle-class-widget.js',
					'public/freemind-import.js',
					'public/tabular-export.js',
					'public/navigation.js',
					'public/auto-save.js',
					'public/file-system-map-source.js',
					'public/retriable-map-source-decorator.js',
					'public/extensions.js',
					'public/score.js',
					'public/s3-file-system.js',
					'public/layout-export.js',
					'public/gold-license-entry-widget.js',
					'public/gold-api.js',
					'public/gold-license-manager.js',
					'public/gold-storage.js',
					'public/s3-file-system.js',
					'public/s3-api.js',
					'public/embedded-map-url-generator.js',
					'public/e/progress.js',
					'public/e/github.js',
					'public/e/dropbox.js'
				],
				options: {
					template: 'test-lib/grunt.tmpl',
					outfile: 'SpecRunner.html',
					keepRunner: true,
					specs: [
						'test/jasmine-tagname-match.js',
						'test/*-spec.js',
						'test/e-github.js',
						'test/e-dropbox.js',
					],
					vendor: [
						'http://mindmup.s3.amazonaws.com/lib/jquery-1.9.1.min.js',
						'http://mindmup.s3.amazonaws.com/lib/bootstrap-2.3.1.min.js',
						'http://mindmup.s3.amazonaws.com/lib/jquery-ui-1.10.0.custom.min.js',
						'http://mindmup.s3.amazonaws.com/lib/kinetic-v4.5.4.min.js',
						'http://mindmup.s3.amazonaws.com/lib/color-0.4.1.min.js'
					],
					helpers: [
						'test-lib/mm.js',
						'test-lib/console-runner.js',
						'test-lib/sinon-1.5.2.js',
						'test-lib/describe-batch.js',
						'test-lib/fake-bootstrap-modal.js',
						'public/mapjs-compiled.js',
					]
				}
			}
		}
	});

	// Load local tasks.
	grunt.loadNpmTasks('grunt-contrib-jasmine');
};