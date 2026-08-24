var gulp = require('gulp');
var terser = require('gulp-terser');
var htmlmin = require('gulp-htmlmin');
var cssmin = require('gulp-cssmin');
var concat = require('gulp-concat');
var zip = require('gulp-zip');
var fs = require('fs');
var mkdirp = require('mkdirp');
var chalk = require('chalk');
var watch = require('gulp-watch');

//Chalk colors
var error = chalk.bold.red;
var success = chalk.green;
var regular = chalk.white;

gulp.task('watch', (done) => {
	gulp.watch('./js/**/*.js', gulp.series('build-js', 'zip', 'check'));
	gulp.watch('./html/**/*.html', gulp.series('build-html', 'check'));
	gulp.watch('./css/**/*.css', gulp.series('build-css', 'check'));
	gulp.watch('./assests/**/*', gulp.series('build-assets', 'check'));
});

gulp.task('build-js', (done) => {
	return gulp.src('./js/**/*.js')
	.pipe(concat('game.js'))
	.pipe(terser())
	.pipe(gulp.dest('./build/'));
});

gulp.task('build-html', (done) => {
	return gulp.src('./html/**/*.html')
		.pipe(htmlmin({collapseWhitespace: true}))
		.pipe(gulp.dest('./build/'));
});

gulp.task('build-css', (done) => {
	return gulp.src('./css/**/*.css')
		.pipe(cssmin())
		.pipe(gulp.dest('./build/'));
});

gulp.task('build-assets', (done) => {
	return gulp.src('./assests/**/*')
		.pipe(gulp.dest('./build/'));
});

gulp.task('zip', (done) => {
	return gulp.src('./build/**/*')
		.pipe(zip('entry.zip')) //gulp-zip performs compression by default
		.pipe(gulp.dest('dist'));
});

gulp.task('check', gulp.series('zip', (done) => {
	var stats = fs.statSync("./dist/entry.zip")
	var fileSize = stats.size;
	if (fileSize > 13312) {
		console.log(error("Your zip compressed game is larger than 13kb (13312 bytes)!"))
		console.log(regular("Your zip compressed game is " + fileSize + " bytes"));
	} else {
		console.log(success("Your zip compressed game is " + fileSize + " bytes."));
	}
	done();
}));

gulp.task('build', gulp.series('build-html', 'build-js', 'build-css', 'build-assets', 'check', (done) => {
	done();
}));