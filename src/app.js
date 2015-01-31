var express = require('express');
var path = require('path');
var requestLogger = require('morgan');
var less = require('less-middleware');

var app = express();

var gameRoute = require('./routes/game')(app.get('env'));
var fetchRegionRoute = require('./routes/fetch_region');
var loginRoute = require('./routes/login');
var registerRoute = require('./routes/register');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(requestLogger('dev'));

app.use(less(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../public')));
if(app.get('env') === 'development') {
	app.use(express.static(path.join(__dirname, 'client')));
	app.use(express.static(path.join(__dirname, 'shared')));
}

app.use('/', gameRoute);
app.use('/fetch_region', fetchRegionRoute);
app.use('/login', loginRoute);
app.use('/register', registerRoute);


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
