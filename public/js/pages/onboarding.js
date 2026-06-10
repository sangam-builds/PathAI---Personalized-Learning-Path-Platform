(() => {
	// Cache onboarding form elements.
	const form = document.getElementById("onboardingForm")
	const submitButton = document.getElementById("submitButton")
	const messageElement = document.querySelector("#formMessage")

	// Exit early if helpers are missing.
	if (!form || !window.Api || !window.Auth) {
		return
	}

	if (window.UI) {
		window.UI.renderFlashFromStorage()
	}

	// Ensure the user is authenticated before onboarding.
	const authData = window.Auth.getAuthData()
	if (!authData?.token) {
		window.location.href = "/login?next=/onboarding"
		return
	}

	if (authData?.user?.onboardingCompleted) {
		window.location.href = "/dashboard"
		return
	}

	// Collect values for all onboarding fields.
	function getFormData() {
		return {
			main_goal: form.querySelector('input[name="main_goal"]:checked')?.value || "",
			background: form.querySelector('input[name="background"]:checked')?.value || "",
			languages: Array.from(form.querySelectorAll('input[name="languages"]:checked')).map(el => el.value),
			track_preference: form.querySelector('input[name="track_preference"]:checked')?.value || "",
			time_commitment: form.querySelector('input[name="time_commitment"]:checked')?.value || "",
			biggest_challenge: form.querySelector('input[name="biggest_challenge"]:checked')?.value || "",
		}
	}

	// Validate all fields before submission.
	function validateForm() {
		const data = getFormData()

		if (!data.main_goal) {
			showMessage("Please select your main goal")
			return false
		}
		if (!data.background) {
			showMessage("Please select your programming background")
			return false
		}
		if (data.languages.length === 0) {
			showMessage("Please select at least one language or 'None yet'")
			return false
		}
		if (!data.track_preference) {
			showMessage("Please select your track preference")
			return false
		}
		if (!data.time_commitment) {
			showMessage("Please select your time commitment")
			return false
		}
		if (!data.biggest_challenge) {
			showMessage("Please select the challenge that resonates most")
			return false
		}

		return true
	}

	function showMessage(text) {
		if (!messageElement) return
		if (text) {
			messageElement.textContent = text
			messageElement.style.display = "block"
		} else {
			messageElement.style.display = "none"
			messageElement.textContent = ""
		}
	}

	// Show the transition screen before redirecting.
	function showTransitionScreen() {
		const formContainer = form.closest("section")
		if (formContainer) {
			formContainer.style.display = "none"
		}
		const transitionScreen = document.getElementById("transition-screen")
		if (transitionScreen) {
			transitionScreen.style.display = "block"
		}
	}

	// Redirect to the level assessment after onboarding.
	function redirectToAssessmentQuiz() {
		if (window.UI) {
			window.UI.setFlashMessage("Onboarding saved. Level assessment is ready.", "success")
		}
		window.location.href = "/assessment"
	}

	// Handle form submission.
	submitButton.addEventListener("click", async (event) => {
		event.preventDefault()

		if (!validateForm()) {
			window.scrollTo({ top: 0, behavior: "smooth" })
			return
		}

		submitButton.disabled = true
		submitButton.textContent = "Saving..."
		showMessage("")

		try {
			const formData = getFormData()

			// Update track name in transition screen
			let trackName = "DSA"
			if (formData.track_preference.includes("Backend")) {
				trackName = "Backend"
			}
			document.getElementById("selectedTrack").textContent = trackName

			// Submit to backend
			const response = await window.Api.apiRequest("/auth/onboarding", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authData.token}`,
				},
				body: JSON.stringify(formData),
			})

			const updatedUser = response?.data?.user
			if (updatedUser) {
				window.Auth.updateAuthUser(updatedUser)
			}

			// Continue directly to assessment quiz after successful onboarding.
			redirectToAssessmentQuiz()
		} catch (error) {
			console.error("Onboarding error:", error)
			showMessage(error?.message || "Failed to save onboarding. Please try again.")
			submitButton.disabled = false
			submitButton.textContent = "Find My Level →"
		}
	})
})()

