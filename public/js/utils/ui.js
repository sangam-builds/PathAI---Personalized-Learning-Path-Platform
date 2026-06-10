(() => {
	// Session-backed flash message storage key.
	const FLASH_STORAGE_KEY = "pathAI.flash"

	// Ensure a toast container exists for transient messages.
	const ensureToastRoot = () => {
		let toastRoot = document.getElementById("appFlashRoot")
		if (toastRoot) {
			return toastRoot
		}

		toastRoot = document.createElement("div")
		toastRoot.id = "appFlashRoot"
		toastRoot.style.position = "fixed"
		toastRoot.style.top = "20px"
		toastRoot.style.right = "20px"
		toastRoot.style.zIndex = "9999"
		toastRoot.style.display = "grid"
		toastRoot.style.gap = "10px"
		document.body.appendChild(toastRoot)
		return toastRoot
	}

	// Persist a message for the next page load.
	const setFlashMessage = (message, type = "info") => {
		if (!message || typeof message !== "string") {
			return
		}

		const payload = {
			message: message.trim(),
			type,
			timestamp: Date.now(),
		}

		sessionStorage.setItem(FLASH_STORAGE_KEY, JSON.stringify(payload))
	}

	// Retrieve and clear any pending flash message.
	const consumeFlashMessage = () => {
		const raw = sessionStorage.getItem(FLASH_STORAGE_KEY)
		if (!raw) {
			return null
		}

		sessionStorage.removeItem(FLASH_STORAGE_KEY)

		try {
			const parsed = JSON.parse(raw)
			if (!parsed?.message) {
				return null
			}
			return parsed
		} catch (_error) {
			return null
		}
	}

	// Render a toast immediately on the current page.
	const showFlashMessage = (message, type = "info", duration = 2600) => {
		if (!message || typeof message !== "string") {
			return
		}

		const toastRoot = ensureToastRoot()
		const toast = document.createElement("div")
		const palette = {
			success: {
				border: "1px solid rgba(75, 211, 158, 0.55)",
				bg: "linear-gradient(140deg, rgba(35, 87, 67, 0.95), rgba(20, 40, 33, 0.95))",
			},
			error: {
				border: "1px solid rgba(255, 109, 127, 0.58)",
				bg: "linear-gradient(140deg, rgba(89, 35, 47, 0.95), rgba(41, 20, 26, 0.95))",
			},
			info: {
				border: "1px solid rgba(123, 116, 222, 0.5)",
				bg: "linear-gradient(140deg, rgba(47, 43, 91, 0.95), rgba(22, 21, 42, 0.95))",
			},
		}

		const stylePreset = palette[type] || palette.info
		toast.textContent = message
		toast.style.minWidth = "240px"
		toast.style.maxWidth = "340px"
		toast.style.padding = "12px 14px"
		toast.style.borderRadius = "10px"
		toast.style.color = "#eef1ff"
		toast.style.fontFamily = "Manrope, sans-serif"
		toast.style.fontSize = "0.92rem"
		toast.style.fontWeight = "700"
		toast.style.letterSpacing = "0.01em"
		toast.style.boxShadow = "0 14px 28px rgba(0, 0, 0, 0.36)"
		toast.style.backdropFilter = "blur(4px)"
		toast.style.border = stylePreset.border
		toast.style.background = stylePreset.bg
		toast.style.opacity = "0"
		toast.style.transform = "translateY(-10px)"
		toast.style.transition = "opacity 0.2s ease, transform 0.2s ease"

		toastRoot.appendChild(toast)
		requestAnimationFrame(() => {
			toast.style.opacity = "1"
			toast.style.transform = "translateY(0)"
		})

		window.setTimeout(() => {
			toast.style.opacity = "0"
			toast.style.transform = "translateY(-8px)"
			window.setTimeout(() => {
				toast.remove()
			}, 220)
		}, duration)
	}

	// Display any pending flash message saved in session storage.
	const renderFlashFromStorage = () => {
		const flash = consumeFlashMessage()
		if (!flash) {
			return
		}
		showFlashMessage(flash.message, flash.type || "info")
	}

	window.UI = {
		setFlashMessage,
		consumeFlashMessage,
		showFlashMessage,
		renderFlashFromStorage,
	}
})()
