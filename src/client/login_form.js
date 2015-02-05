$(document).ready(function () {
	$('.textButton').hover(
		function () {
			$(this).text(">> " + $(this).text());
		},
		function () {
			$(this).text($(this).text().substr(3));
		}
	);

	$('#signInButton').click(function () {
		$.post(
			"login",
			$("#signInForm").serialize(),
			function (data) {
				if (data.error) {
					$('#signInError').show().text(data.error);
					$('#signInText').hide();
				} else if (data.text) {
					$('#signInError').hide();
					$('#signInText').show().text(data.text);

					setTimeout(function () {
						var panel = $('#panelTopRight');
						panel.animate({
							height: "20px",
							width: "100px",
							right: "+=" + (window.innerWidth - 180) + "px",
							top: "+=" + (window.innerHeight - 80) + "px"
						}, 1000, function () {
							panel.find('*').hide();
							panel.remove();
							sand.elephantLayer.initializeInventory(data.rocks);
						});
					}, 1000);
				}
			}
		);
	});

	$('#resetPasswordButton').click(function () {
		$.post(
			"request_password_reset",
			$("#signInForm").serialize(),
			function (data) {
				if (data.error) {
					$('#signInError').show().text(data.error);
					$('#signInText').hide();
				} else if (data.text) {
					$('#signInError').hide();
					$('#signInText').show().text(data.text);
				}
			}
		)
	});

	$('#registerButton').click(function () {
		$.post(
			"register",
			$("#registerForm").serialize(),
			function (data) {
				if (data.error) {
					$('#registrationError').show().text(data.error);
					$('#registrationText').hide();
				} else if (data.text) {
					$('#registrationError').hide();
					$('#registrationText').show().text(data.text);
				}
			}
		);
	});
});