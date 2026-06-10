// Cache load/auth promises to avoid duplicate network calls.
let googleScriptPromise = null
let googleClientIdPromise = null

const GOOGLE_SCRIPT_SELECTOR = 'script[src^="https://accounts.google.com/gsi/client"]'
const SCRIPT_READY_TIMEOUT_MS = 7000

// Wait for the Google Identity Services library to be ready.
const waitForGoogleOAuthApi = (timeoutMs = SCRIPT_READY_TIMEOUT_MS) =>
	new Promise((resolve, reject) => {
		const start = Date.now()

		const checkReady = () => {
			if (window.google?.accounts?.oauth2?.initTokenClient) {
				resolve()
				return
			}

			if (Date.now() - start >= timeoutMs) {
				reject(
					new Error(
						"Google sign-in script was blocked by the browser or network. Disable shields/ad blockers for this site and try again."
					)
				)
				return
			}

			window.setTimeout(checkReady, 100)
		}

		checkReady()
	})

// Wire load/error handlers for the injected script tag.
const attachScriptListeners = (script, resolve, reject) => {
	const onLoad = () => {
		waitForGoogleOAuthApi().then(resolve).catch(reject)
	}

	const onError = () => {
		reject(
			new Error(
				"Google sign-in script failed to load. Check internet connection and disable privacy blockers for this site."
			)
		)
	}

	script.addEventListener("load", onLoad, { once: true })
	script.addEventListener("error", onError, { once: true })

	return { onLoad, onError }
}

// Load the Google OAuth script once and reuse the promise.
const loadGoogleScript = () => {
	if (!googleScriptPromise) {
		googleScriptPromise = new Promise((resolve, reject) => {
			if (window.google?.accounts?.oauth2?.initTokenClient) {
				resolve()
				return
			}

			const existingScript = document.querySelector(GOOGLE_SCRIPT_SELECTOR)

			if (existingScript) {
				if (existingScript.dataset.loaded === "true") {
					waitForGoogleOAuthApi().then(resolve).catch(reject)
					return
				}

				attachScriptListeners(existingScript, resolve, reject)
				return
			}

			const script = document.createElement("script")
			script.src = "https://accounts.google.com/gsi/client"
			script.async = true
			script.defer = true
			script.dataset.loaded = "false"
			script.addEventListener(
				"load",
				() => {
					script.dataset.loaded = "true"
				},
				{ once: true }
			)

			attachScriptListeners(script, resolve, reject)
			document.head.appendChild(script)
		})
			.catch((error) => {
				googleScriptPromise = null
				throw error
			})
	}

	return googleScriptPromise
}

// Retry once by removing a stale script element if needed.
const loadGoogleScriptWithRetry = async () => {
	try {
		await loadGoogleScript()
		return
	} catch (_error) {
		const staleScript = document.querySelector(GOOGLE_SCRIPT_SELECTOR)
		if (staleScript) {
			staleScript.remove()
		}

		googleScriptPromise = null
		await loadGoogleScript()
	}
}

// Fetch the client ID from the backend config endpoint.
const getGoogleClientId = async () => {
	if (!googleClientIdPromise) {
		googleClientIdPromise = window.Api.apiRequest("/auth/google/config")
			.then((response) => response?.data?.clientId)
			.then((clientId) => {
				if (!clientId) {
					throw new Error("Google login is not configured on this server")
				}

				return clientId
			})
	}

	return googleClientIdPromise
}

// Request an OAuth access token via Google Identity Services.
const requestGoogleAccessToken = async (clientId) => {
	await loadGoogleScriptWithRetry()

	return new Promise((resolve, reject) => {
		const tokenClient = window.google.accounts.oauth2.initTokenClient({
			client_id: clientId,
			scope: "openid email profile",
			callback: (response) => {
				if (!response || response.error || !response.access_token) {
					reject(new Error("Google authentication failed"))
					return
				}

				resolve(response.access_token)
			},
		})

		tokenClient.requestAccessToken({ prompt: "consent" })
	})
}

// Full flow: load script, request token, then exchange with backend.
const authenticateWithGoogle = async () => {
	if (!window.Api) {
		throw new Error("API utility is not available")
	}

	const clientId = await getGoogleClientId()
	const accessToken = await requestGoogleAccessToken(clientId)

	const response = await window.Api.apiRequest("/auth/google", {
		method: "POST",
		body: JSON.stringify({ accessToken }),
	})

	const authData = {
		token: response?.data?.token,
		user: response?.data?.user,
	}

	if (!authData.token) {
		throw new Error("Google login succeeded but no token was returned")
	}

	return authData
}

window.GoogleAuth = {
	authenticateWithGoogle,
}
