var debug = require('debug')('calculator');

module.exports = {
	add: function(one, other){
		debug('Adding numbers:', one, other);
		var result = one + other;
		debug('Result:', result);
		return result;
	}
}