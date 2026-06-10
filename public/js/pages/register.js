(() => {
	// Cache form elements for registration flow.
	const form = document.getElementById("registerForm")
	const nameInput = document.getElementById("name")
	const emailInput = document.getElementById("email")
	const passwordInput = document.getElementById("password")
	const submitButton = document.getElementById("submitButton")
	const googleAuthButton = document.getElementById("googleAuthButton")
	const messageElement = document.getElementById("formMessage")
	const togglePasswordButton = document.getElementById("togglePassword")

	// Exit early if helpers are unavailable.
	if (!form || !window.Api || !window.Auth) {
		return
	}
	// Global helpers live on window to avoid per-page imports.
	if (window.UI) {
		window.UI.renderFlashFromStorage()
	}

	// Redirect authenticated users away from the signup screen.
	const existingAuth = window.Auth.getAuthData()
	if (existingAuth?.token) {
		const redirectPath = existingAuth?.user?.onboardingCompleted ? "/dashboard" : "/onboarding"
		window.location.href = redirectPath
		return
	}

	function resolvePostAuthPath(authData) {
		return authData?.user?.onboardingCompleted ? "/dashboard" : "/onboarding"
	}

	function showMessage(text, isSuccess = false) {
		messageElement.textContent = text
		messageElement.classList.toggle("success", isSuccess)
	}

	// Toggle password visibility for better UX.
	function setupPasswordToggle(button, input) {
		button.addEventListener("click", () => {
			const isHidden = input.type === "password"
			input.type = isHidden ? "text" : "password"
			const isVisible = isHidden
			button.classList.toggle("is-visible", isVisible)
			button.setAttribute("aria-label", isVisible ? "Hide password" : "Show password")
			button.setAttribute("title", isVisible ? "Hide password" : "Show password")
		})
	}

	function validateForm() {
		const name = nameInput.value.trim()
		const email = emailInput.value.trim()
		const password = passwordInput.value

		if (!name || name.length < 2) {
			showMessage("Please enter your full name (at least 2 characters).")
			nameInput.focus()
			return false
		}

		if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
			showMessage("Please enter a valid email address.")
			emailInput.focus()
			return false
		}

		if (!password || password.length < 6) {
			showMessage("Password must be at least 6 characters.")
			passwordInput.focus()
			return false
		}

		showMessage("")
		return true
	}

	setupPasswordToggle(togglePasswordButton, passwordInput)

	// Google signup flow.
	if (googleAuthButton && window.GoogleAuth) {
		googleAuthButton.addEventListener("click", async () => {
			googleAuthButton.disabled = true
			googleAuthButton.textContent = "Connecting..."
			showMessage("")

			try {
				const authData = await window.GoogleAuth.authenticateWithGoogle()
				window.Auth.saveAuthData(authData, true)
				showMessage("Google signup successful. Redirecting...", true)
				if (window.UI) {
					window.UI.setFlashMessage("Account created successfully.", "success")
				}

				setTimeout(() => {
					window.location.href = resolvePostAuthPath(authData)
				}, 600)
			} catch (error) {
				showMessage(error.message || "Google signup failed. Please try again.")
				googleAuthButton.disabled = false
				googleAuthButton.innerHTML = `
					<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
						<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
						<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
						<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
					</svg>
					Continue with Google
				`
			}
		})
	}

	form.addEventListener("submit", async (event) => {
		// Handle submission via API without a full page reload.
		event.preventDefault()

		if (!validateForm()) {
			return
		}

		submitButton.disabled = true
		submitButton.textContent = "Creating Account..."
		showMessage("")

		try {
			const payload = {
				name: nameInput.value.trim(),
				email: emailInput.value.trim(),
				password: passwordInput.value,
			}

			const response = await window.Api.apiRequest("/auth/register", {
				method: "POST",
				body: JSON.stringify(payload),
			})

			const authData = {
				token: response?.data?.token,
				user: response?.data?.user,
			}

			if (!authData.token) {
				throw new Error("Account created but no token was received.")
			}

			window.Auth.saveAuthData(authData, true)
			showMessage("Account created successfully. Redirecting...", true)
			if (window.UI) {
				window.UI.setFlashMessage("Account created successfully.", "success")
			}

			setTimeout(() => {
				window.location.href = resolvePostAuthPath(authData)
			}, 700)
		} catch (error) {
			showMessage(error.message || "Unable to create account right now. Please try again.")
		} finally {
			submitButton.disabled = false
			submitButton.textContent = "Create Account"
		}
	})
})()
