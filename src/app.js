var express = require('express');
var path = require('path');
var requestLogger = require('morgan');
var less = require('less-middleware');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(requestLogger('dev'));

app.use(less(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../public')));
if(app.get('env') === 'development') {
	app.use(express.static(path.join(__dirname, 'client')));
	app.use(express.static(path.join(__dirname, 'shared')));
}

app.use('/', require('./routes/game')(app.get('env')));
app.use('/fetch_region', require('./routes/fetch_region'));
app.use('/login', require('./routes/users/login'));
app.use('/register', require('./routes/users/register'));
app.use('/request_password_reset', require('./routes/users/request_password_reset'));
app.use('/reset_password', require('./routes/users/reset_password'));
app.use('/set_new_password', require('./routes/users/set_new_password'));
app.use('/confirm_email', require('./routes/users/confirm_email'));

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
