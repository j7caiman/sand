var express = require('express');
var path = require('path');
var logger = require('morgan');

var bodyParser = require('body-parser');

var game = require('./routes/game');
var fetch_region = require('./routes/fetch_region');
var write_to_region = require('./routes/write_to_region');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json({limit: '500kb'}));
app.use(require('less-middleware')(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../public')));
if(app.get('env') === 'development') {
    app.use(express.static(path.join(__dirname, 'client')));
    app.use(express.static(path.join(__dirname, 'shared')));
}

app.use('/', game);
app.use('/fetch_region', fetch_region);
app.use('/write_to_region', write_to_region);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
