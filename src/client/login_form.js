$(document).ready(function () {
	$('#signInInput').click(function () {
		$.post(
			"login",
			$("#signInForm").serialize(),
			function (data) {
				if(data.error) {

				} else {
					sand.elephantLayer.initializeInventory(data);
				}
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