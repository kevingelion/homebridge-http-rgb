module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.initConfig({
      jshint: {
        all: ['**/*.js', '!node_modules/**']
      },
      mochaTest: {
        test: {
          options: {
            reporter: 'nyan'
          },
          src: ['test/simple.js']
        }
      }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('default', 'mochaTest');
    
    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('test', 'mochaTest');
};