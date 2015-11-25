/*global module*/

/*
Installing Grunt and associated contributions

- once only per machine
install node and npm:
	http://nodejs.org/download/
install grunt cli:
	npm install -g grunt-cli

- per project
npm install
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
			specs_full: {
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
		concat: {
			options: {
			},
			lib: {
				src: ['public/mapjs-compiled.js', 'public/mm.js', 'public/lib/*.js', 'public/main.js'],
				dest: 'compiled/mm-compiled.js'
			},
			mmios: {
				src: [
					'public/mapjs-compiled.js',
					'public/mm.js',
					'public/mm-ios.js',
					'public/mapjs-compiled.js',
					'public/lib/activity-log.js',
					'public/lib/icon-editor-widget.js',
					'public/lib/active-content-resource-manager.js',
					'public/lib/active-content-listener.js',
					'public/lib/atlas-prepopulate-widget.js',
					'public/lib/resource-compressor.js',
					'public/lib/map-controller.js',
					'public/lib/auto-save.js',
					'public/lib/json-storage.js',
					'public/lib/gold-api.js',
					'public/lib/gold-license-manager.js',
					'public/lib/layout-export.js',
					'public/lib/s3-api.js',
					'public/lib/local-storage-clipboard.js',
					'public/lib/activity-log.js'
				],
				dest: 'public/ios/4/mm-compiled-ios.js'
			},
			libios3: {
				src: [
					'public/ios/3/mm-compiled-ios.js',
					'public/lib-ios/3/*.js',
					'public/ios/3/main-ios.js'
				],
				dest: 'compiled/mm-ios-compiled-3.js'
			},
			libios4: {
				src: [
					'public/ios/4/mm-compiled-ios.js',
					'public/lib-ios/4/*.js',
					'public/ios/4/main-ios.js'
				],
				dest: 'compiled/mm-ios-compiled-4.js'
			}
		},
		uglify: {
			compiled: {
				options: {
					sourceMap: true
				},
				files: {
					'compiled/mm-compiled.min.js': ['compiled/mm-compiled.js'],
					'compiled/mm-embedded.min.js': ['compiled/mm-embedded.js'],
					'compiled/mm-ios-compiled-3.min.js': ['compiled/mm-ios-compiled-3.js'],
					'compiled/mm-ios-compiled-4.min.js': ['compiled/mm-ios-compiled-4.js']
				}
			}
		},
		cssmin: {
			combine: {
				files: {
					'compiled/combined.css': ['public/mindmap.css', 'public/mapjs.css'],
					'compiled/combined-ios-3.css': ['public/ios/3/mindmap-ios.css', 'public/ios/3/mapjs.css'],
					'compiled/combined-ios-4.css': ['public/ios/4/*-ios.css', 'public/ios/4/mapjs.css'],
					'compiled/mapjs.css': ['public/mapjs.css']
				}
			}
		},
		jscs: {
			src: ['public/lib*/**/*.js', 'test/*.js', 'public/e/*.js', 'public/main*.js'],
			options: {
				config: '.jscsrc',
				reporter: 'inline'
			}
		},
		jshint: {
			all: ['public/lib*/**/*.js', 'test/*.js', 'public/e/*.js', 'public/main*.js'],
			options: {
				jshintrc: true
			}
		},
		jasmine: {
			all: {
				src: [
					'public/lib/*.js',
					'public/lib-ios/4/*.js',
					'public/e/progress.js',
					'public/e/github.js',
					'public/e/dropbox.js',
					'public/e/google-collaboration.js'
				],
				options: {
					template: 'test-lib/grunt.tmpl',
					outfile: 'SpecRunner.html',
					summary: true,
					display: 'short',
					keepRunner: true,
					specs: [
						'test/*.js'
					],
					vendor: [
						grunt.option('external-scripts') || 'http://d1g6a398qq2djm.cloudfront.net/20150106142106/external.js'
					],
					helpers: [
						'test-lib/sinon-1.5.2.js',
						'test-lib/jasmine-describe-batch.js',
						'test-lib/fake-bootstrap-modal.js',
						'test-lib/jasmine-tagname-match.js',
						'test-lib/jquery-extension-matchers.js',
						'public/mm.js',
						'public/mm-ios.js',
						'public/mapjs-compiled.js'
					]
				}
			}
		}
	});
	grunt.registerTask('checkstyle', ['jshint', 'jscs']);
	grunt.registerTask('precommit', ['checkstyle', 'jasmine']);

	grunt.registerTask('compile', ['jasmine', 'concat:lib', 'concat:libios3', 'concat:libios4', 'uglify', 'cssmin:combine']);
	grunt.registerTask('compile-ios', ['concat:mmios', 'compile']);

	// Load local tasks.
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-notify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-jscs');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.event.on('watch', function (action, filepath, target) {
		grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
		var options = grunt.config(['jasmine', 'all']);

		if (target.indexOf('_full') > 0) {
			options.options.display = 'full';
			options.options.summary = false;
		}

		if (target.indexOf('specs') === 0) {
			options.options.specs = [filepath];
		} else {
			options.options.specs = ['test/*.js'];
		}
		grunt.config(['jasmine', 'all'], options);

	});
};
