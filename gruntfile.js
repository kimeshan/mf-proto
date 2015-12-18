module.exports = function(grunt) {

  grunt.initConfig({
    shell: {
		mongodb: {
			command: 'runmongo.sh',
			options: {
				async: true,
				stdout: false,
				stderr: true,
				failOnError: true,
				execOptions: {
					cwd: '.'
				}
			}
		},
		nodejs: {
			command: 'node server.js',
			options: {
				async: false,
				stdout: false,
				stderr: true,
				failOnError: true,
				execOptions: {
					cwd: '.'
				}
			}
		}
	}
  });

  grunt.loadNpmTasks('grunt-shell-spawn');

  grunt.registerTask('run-maxflow', ['shell']);

};