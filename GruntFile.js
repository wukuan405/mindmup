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
npm install grunt-contrib-concat --save-dev
npm install grunt-contrib-uglify --save-dev
npm install grunt-contrib-cssmin --save-dev

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
		concat: {
			options: {
			},
			lib: {
				src: ['public/mapjs-compiled.js', 'public/mm.js', 'public/lib/*.js', 'public/main.js'],
				dest: 'compiled/mm-compiled.js',
			}
		},
		uglify: {
			compiled: {
				files: {
					'compiled/mm-compiled.min.js': ['compiled/mm-compiled.js'],
					'compiled/mm-embedded.min.js': ['compiled/mm-embedded.js']
				}
			},
		},
		cssmin: {
			combine: {
				files: {
					'compiled/mindmap.css': ['public/*.css']
				}
			}
		},
		jasmine: {
			all: {
				src: [
					'public/lib/*.js',
					'public/e/progress.js',
					'public/e/github.js',
					'public/e/dropbox.js',
				],
				options: {
					template: 'test-lib/grunt.tmpl',
					outfile: 'SpecRunner.html',
					keepRunner: true,
					specs: [
						'test/*.js',
					],
					vendor: [
						grunt.option('external-scripts') || 'http://static.mindmup.com/20131204091534/external.js'
					],
					helpers: [
						'test-lib/sinon-1.5.2.js',
						'test-lib/jasmine-describe-batch.js',
						'test-lib/fake-bootstrap-modal.js',
						'test-lib/jasmine-tagname-match.js',
						'public/mm.js',
						'public/mapjs-compiled.js',
					]
				}
			}
		}
	});
	grunt.registerTask('compile', ['jasmine', 'concat', 'uglify', 'cssmin:combine']);

	// Load local tasks.
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-notify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');

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
