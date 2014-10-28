// define a function
var sayHi = function (who) {
	console.log("Hello" + (who ? ", " + who : "") + "!");
};
// invoke a function
sayHi(); // "Hello"
sayHi('world'); // "Hello, world!"
// apply a function
sayHi.apply(null, ["hello"]); // "Hello, hello!"

var alien = {
	sayHi: function (who) {
		console.log("Hi" + (who ? ", " + who : "") + "!");
	}
};
alien.sayHi('world'); // "Hello, world!"
sayHi.apply(alien, ["humans"]); // "Hello, humans!"




function add(a, b) {
	if (arguments.length < 1) {
		return add;
	} else if (arguments.length < 2) {
		return function(c) { return a + c }
	} else {
		return a + b;
	}
}

console.log(add(5,4));
console.log(add(5)(4));
console.log(add(4));
console.log(add(5,4));