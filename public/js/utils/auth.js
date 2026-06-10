// Storage key for persisted auth payloads.
const AUTH_STORAGE_KEY = "authData"

function saveAuthData(authPayload, remember = true) {
	// Persist auth in localStorage (remember) or sessionStorage (session-only).
	const storage = remember ? localStorage : sessionStorage
	const otherStorage = remember ? sessionStorage : localStorage

	otherStorage.removeItem(AUTH_STORAGE_KEY)
	storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authPayload))
}

function getAuthData() {
	// Prefer any stored auth payload, regardless of storage location.
	const fromLocal = localStorage.getItem(AUTH_STORAGE_KEY)
	const fromSession = sessionStorage.getItem(AUTH_STORAGE_KEY)
	const raw = fromLocal || fromSession

	if (!raw) {
		return null
	}

	try {
		return JSON.parse(raw)
	} catch (_error) {
		// Cleanup corrupted payloads so the app can recover cleanly.
		localStorage.removeItem(AUTH_STORAGE_KEY)
		sessionStorage.removeItem(AUTH_STORAGE_KEY)
		return null
	}
}

function clearAuthData() {
	localStorage.removeItem(AUTH_STORAGE_KEY)
	sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

function updateAuthUser(userUpdates) {
	// Merge user updates into the stored auth payload.
	const currentAuth = getAuthData()

	if (!currentAuth) {
		return null
	}

	const updatedAuth = {
		...currentAuth,
		user: {
			...(currentAuth.user || {}),
			...(userUpdates || {}),
		},
	}

	const fromLocal = localStorage.getItem(AUTH_STORAGE_KEY)
	const shouldPersistInLocal = Boolean(fromLocal)
	saveAuthData(updatedAuth, shouldPersistInLocal)

	return updatedAuth
}

window.Auth = {
	saveAuthData,
	getAuthData,
	clearAuthData,
	updateAuthUser,
}
