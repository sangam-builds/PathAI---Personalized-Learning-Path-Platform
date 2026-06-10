// Shared API helper for JSON requests against the backend.
const API_BASE_URL = "/api"

async function apiRequest(path, options = {}) {
	// Merge caller headers with the default JSON content type.
	const mergedHeaders = {
		"Content-Type": "application/json",
		...(options.headers || {}),
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: mergedHeaders,
	})

	// Parse JSON responses (fallback to empty object on non-JSON bodies).
	const data = await response.json().catch(() => ({}))

	// Normalize API errors with a consistent message.
	if (!response.ok) {
		const message = data?.message || "Request failed"
		throw new Error(message)
	}

	return data
}

window.Api = {
	apiRequest,
}
