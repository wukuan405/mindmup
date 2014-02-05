/*global module*/

/*
Installing Grunt and associated contributions

- once only per machine
install node and npm:
	http://nodejs.org/download/
install grunt cli:
	npm install -g grunt-cli

- per project
npm install grunt-contrib-jasmine --save-dev
npm install grunt-notify --save-dev
npm install grunt-contrib-watch --save-dev

*/
module.exports = function (grunt) {
	'use strict';
	grunt.initConfig({
		watch: {
			specs: {
				files: ['test/*.js'],
				tasks: ['jasmine'],
				options: {
					spawn: false
				}
			},
			src: {
				files: ['public/**/*.js'],
				tasks: ['jasmine'],
				options: {
					spawn: false
				}

			}
		},
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
					'public/e/dropbox.js',
					'public/measures-model.js',
					'public/modal-measures-sheet-widget.js'
				],
				options: {
					template: 'test-lib/grunt.tmpl',
					outfile: 'SpecRunner.html',
					keepRunner: true,
					specs: [
						'test/*.js',
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
						'test-lib/jasmine-tagname-match.js',
						'public/mapjs-compiled.js',
					]
				}
			}
		}
	});

	// Load local tasks.
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-notify');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.event.on('watch', function (action, filepath, target) {
		grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
		var options = grunt.config(['jasmine', 'all']);
		if (target === 'specs') {
			options.options.specs = [filepath];
		} else {
			options.options.specs = ['test/*.js'];
		}
		grunt.config(['jasmine', 'all'], options);

	});
};
