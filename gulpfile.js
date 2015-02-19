var gulp = require('gulp');
var sweet = require('gulp-sweetjs');
var mocha = require('gulp-mocha');
var rename = require('gulp-rename');
var license = require('gulp-license');
var concat = require('gulp-concat');
var bump = require('gulp-bump');
var hint = require('gulp-jshint');
var clean = require('gulp-clean');
var surround = require('./gulp-surround');
var _ = require('lodash');

gulp.task('dev', ['build.sweet', 'hint']);
gulp.task('default', ['build.sweet', 'hint']);

gulp.task('bump', function() {
    return gulp.
        src('package.json').
        pipe(bump({type: 'patch'})).
        pipe(gulp.dest('./'));
});

gulp.task('build.sweet', function() {
    return compileSweet();
});

gulp.task('hint', function() {
    return gulp.
        src(['src/**/*.js']).
        pipe(hint());
});

function compileSweet(opts) {
    opts = opts || {};
    opts.src = [
        './macros/**/*.js'
    ].concat(opts.src || []);
    console.log(opts.src);
    var catBuild = gulp.src(opts.src).
        pipe(sweet({
            modules: ['./macros/fnToString.sjs'],
            readableNames: true
        }));
    return catBuild.pipe(gulp.dest(opts.dest || 'src'));
}
