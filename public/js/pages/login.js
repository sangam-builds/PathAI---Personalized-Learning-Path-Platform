(() => {
	// Cache form elements for login interactions.
	const form = document.getElementById("loginForm")
	const emailInput = document.getElementById("email")
	const passwordInput = document.getElementById("password")
	const submitButton = document.getElementById("submitButton")
	const googleAuthButton = document.getElementById("googleAuthButton")
	const messageElement = document.getElementById("formMessage")
	const togglePasswordButton = document.getElementById("togglePassword")
	const nextPath = new URLSearchParams(window.location.search).get("next")
	const safeRedirectPath = nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard"

	// Ensure the redirect stays on this origin.
	function resolvePostAuthPath() {
		return safeRedirectPath
	}

	// Exit early if required helpers are missing.
	if (!form || !window.Api || !window.Auth) {
		return
	}

	if (window.UI) {
		window.UI.renderFlashFromStorage()
	}

	// Skip login if the user already has a token.
	const existingAuth = window.Auth.getAuthData()
	if (existingAuth?.token) {
		window.location.href = resolvePostAuthPath()
		return
	}

	function showMessage(text, isSuccess = false) {
		messageElement.textContent = text
		messageElement.classList.toggle("success", isSuccess)
	}

	// Client-side validation for basic form fields.
	function validateForm() {
		const email = emailInput.value.trim()
		const password = passwordInput.value

		if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
			showMessage("Please enter a valid email address.")
			emailInput.focus()
			return false
		}

		if (!password) {
			showMessage("Password is required.")
			passwordInput.focus()
			return false
		}

		showMessage("")
		return true
	}

	togglePasswordButton.addEventListener("click", () => {
		const isHidden = passwordInput.type === "password"
		passwordInput.type = isHidden ? "text" : "password"
		const isVisible = isHidden
		togglePasswordButton.classList.toggle("is-visible", isVisible)
		togglePasswordButton.setAttribute("aria-label", isVisible ? "Hide password" : "Show password")
		togglePasswordButton.setAttribute("title", isVisible ? "Hide password" : "Show password")
	})

	// Google sign-in flow.
	if (googleAuthButton && window.GoogleAuth) {
		googleAuthButton.addEventListener("click", async () => {
			googleAuthButton.disabled = true
			googleAuthButton.textContent = "Connecting..."
			showMessage("")

			try {
				const authData = await window.GoogleAuth.authenticateWithGoogle()
				window.Auth.saveAuthData(authData, true)
				showMessage("Google login successful. Redirecting...", true)
				if (window.UI) {
					window.UI.setFlashMessage("Logged in successfully.", "success")
				}

				setTimeout(() => {
					window.location.href = resolvePostAuthPath()
				}, 600)
			} catch (error) {
				showMessage(error.message || "Google login failed. Please try again.")
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

	// Email/password login flow.
	form.addEventListener("submit", async (event) => {
		event.preventDefault()

		if (!validateForm()) {
			return
		}

		submitButton.disabled = true
		submitButton.textContent = "Signing In..."
		showMessage("")

		try {
			const payload = {
				email: emailInput.value.trim(),
				password: passwordInput.value,
			}

			const response = await window.Api.apiRequest("/auth/login", {
				method: "POST",
				body: JSON.stringify(payload),
			})

			const authData = {
				token: response?.data?.token,
				user: response?.data?.user,
			}

			if (!authData.token) {
				throw new Error("Login succeeded but no token was received.")
			}

			window.Auth.saveAuthData(authData, true)
			showMessage("Login successful. Redirecting...", true)
			if (window.UI) {
				window.UI.setFlashMessage("Logged in successfully.", "success")
			}

			setTimeout(() => {
				window.location.href = resolvePostAuthPath()
			}, 600)
		} catch (error) {
			showMessage(error.message || "Unable to login right now. Please try again.")
		} finally {
			submitButton.disabled = false
			submitButton.textContent = "Sign In"
		}
	})
})()
