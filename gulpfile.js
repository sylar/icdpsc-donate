'use strict';

var gulp = require('gulp');
var express = require('express');
var compression = require('compression');
var $ = require('gulp-load-plugins')();

var wiredep = require('wiredep').stream;
var browserSync = require('browser-sync');
var saveLicense = require('uglify-save-license');
var penthouse = require('penthouse');
var pagespeed = require('psi');
var ngrok = require('ngrok');
var path = require('path');
var fs = require('fs');

var paths = {
  client: path.normalize('./client'),
  public: path.normalize('./public'),
  temp: path.normalize('./.tmp')
};

var options = {
  autoprefixer: [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
  ],
  uglify: {
    preserveComments: saveLicense
  },
  imagemin: {
    progressive: true,
    interlaced: true
  },
  jade: {
    pretty: true
  }
};

gulp.task('wiredep', function () {
  return gulp.src(path.normalize(path.join(paths.client, 'index.jade')))
    .pipe(wiredep())
    .pipe(gulp.dest(paths.client));
});

gulp.task('html:jade', ['wiredep'], function () {
  return gulp.src(path.normalize(path.join(paths.client, 'index.jade')))
    .pipe($.jade(options.jade))
    .pipe(gulp.dest(paths.temp))
    .pipe(browserSync.reload({stream:true}));
});

gulp.task('css:stylus', function () {
  return gulp.src(path.normalize(path.join(paths.client, '/style/main.styl')))
    .pipe($.stylus())
    .pipe($.autoprefixer(options.autoprefixer))
    .pipe(gulp.dest(path.normalize(path.join(paths.temp, '/css'))))
    .pipe(browserSync.reload({stream:true}));
});

gulp.task('js:coffee', function () {
  return gulp.src(path.normalize(path.join(paths.client, '/coffee/*.coffee')))
    .pipe($.coffee(options.coffee))
    .pipe(gulp.dest(path.normalize(path.join(paths.temp, '/js'))))
    .pipe(browserSync.reload({stream:true}));
});

gulp.task('assets:move', function () {
  var imgFilter = $.filter('**/img/**/*.*');
  return gulp.src(paths.client + '/assets/**/*')
    .pipe(imgFilter)
    .pipe($.cache($.imagemin(options.imagemin)))
    .pipe(imgFilter.restore())
    .pipe(gulp.dest(path.normalize(path.join(paths.public, '/assets'))));
});

gulp.task('build:common', ['html:jade', 'css:stylus', 'js:coffee'], function () {});

gulp.task('build:dist:base', ['build:common', 'assets:move'], function () {
  var jsFilter = $.filter('**/*.js');
  var cssFilter = $.filter('**/*.css');
  var htmlFilter = $.filter('**/*.html');
  var assets = $.useref.assets();

  return gulp.src(path.normalize(path.join(paths.temp, 'index.html')))
    .pipe(assets)

    .pipe(jsFilter)
    .pipe($.uglify(options.uglify))
    .pipe(jsFilter.restore())

    .pipe(cssFilter)
    .pipe($.minifyCss())
    .pipe(cssFilter.restore())

    .pipe(assets.restore())
    .pipe($.useref())

    .pipe(htmlFilter)
    .pipe($.minifyHtml())
    .pipe(htmlFilter.restore())

    .pipe(gulp.dest(paths.public));
});

var criticalCSS = '';

gulp.task('css:critical', ['build:dist:base'], function (done) {

  var s = express();
  var p = 9876;

  s.use('/', express.static(paths.public));

  var server = s.listen(p, function () {
    penthouse({
      url: 'http://localhost:' + p,
      css: path.join(paths.public, '/css/main.css'),
      width: 1440,
      height: 900
    }, function (error, cCSS) {
      criticalCSS = cCSS.replace('\n', '');
      $.util.log('Critical CSS size: ' + cCSS.length + ' bytes.');
      server.close();
      done();
    });
  });
});

gulp.task('build:dist', ['css:critical'], function () {
  fs.writeFile(path.normalize(path.join(paths.public, 'CNAME')), 'constantinescu.io', function (err) {
    if (err) {
      console.log('Error: ',err.message);
    }
  });
  return gulp.src(path.normalize(path.join(paths.public, 'index.html')))
    .pipe($.replace(
      '<link rel=stylesheet href=css/main.css>',
      '<style>' + criticalCSS + '</style>'
    ))
    .pipe(gulp.dest(paths.public));
});

gulp.task('watch', ['build:common'], function () {
  gulp.watch(['bower.json'], ['wiredep']);
  gulp.watch([path.normalize(path.join(paths.client, '/style/**.*'))], ['css:stylus']);
  gulp.watch([path.normalize(path.join(paths.client, 'index.jade'))], ['html:jade']);
  gulp.watch([path.normalize(path.join(paths.client, '/coffee/**.*'))], ['js:coffee']);

  browserSync.init({
    server: {
      baseDir: [paths.temp, paths.client]
    }
  });
});

gulp.task('serve', ['build:common'], function () {
  browserSync.init({
    server: {
      baseDir: paths.public
    }
  });
});

gulp.task('pagespeed', function (done) {
  var s = express();
  var p = 9876;

  s.use(compression());
  s.listen(p);

  ngrok.connect(p, function(err, url) {
    pagespeed({
      url: url,
      strategy: 'mobile'
    }, function () {
      done();
      ngrok.disconnect();
      process.exit(0);
    });
  });
});

gulp.task('clean', function () {
  gulp.src(path.normalize(paths.public))
    .pipe($.rimraf());
  return gulp.src(path.normalize(paths.temp))
    .pipe($.rimraf());
});
