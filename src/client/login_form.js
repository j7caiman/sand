$(document).ready(function () {
	$('#signInInput').click(function () {
		$.post(
			"login",
			$("#signInForm").serialize(),
			function (data) {
				console.log();
			}
		);
	});

	$('#registerInput').click(function () {
		$.post(
			"register",
			$("#registerForm").serialize(),
			function (data) {
				console.log();
			}
		);
	});
});