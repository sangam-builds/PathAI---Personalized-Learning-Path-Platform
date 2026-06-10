(() => {
	// Local UI state for courses and reader pane.
	const state = {
		topics: [],
		activeTopicId: null,
		requestedCourseId: null,
		requestedTopicId: null,
	}

	// Cache DOM references.
	const el = {
		courseTitle: document.getElementById("courseTitle"),
		courseSubtitle: document.getElementById("courseSubtitle"),
		summaryLevel: document.getElementById("summaryLevel"),
		summaryProgress: document.getElementById("summaryProgress"),
		summaryTopics: document.getElementById("summaryTopics"),
		topicList: document.getElementById("topicList"),
		readerEmpty: document.getElementById("readerEmpty"),
		readerContent: document.getElementById("readerContent"),
		readerMeta: document.getElementById("readerMeta"),
		readerTitle: document.getElementById("readerTitle"),
		readerBody: document.getElementById("readerBody"),
		takeQuizBtn: document.getElementById("takeQuizBtn"),
		goDashboardBtn: document.getElementById("goDashboardBtn"),
	}

	const capitalize = (value) => {
		if (!value) {
			return "Unknown"
		}

		return String(value).charAt(0).toUpperCase() + String(value).slice(1)
	}

	const escapeHtml = (text) => {
		return String(text || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\"/g, "&quot;")
			.replace(/'/g, "&#39;")
	}

	const formatInline = (text) => {
		return text
			.replace(/`([^`]+)`/g, "<code>$1</code>")
			.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
	}

	// Render markdown-style tables into HTML.
	const renderTable = (rows) => {
		if (!rows.length) {
			return ""
		}

		const parsed = rows.map((line) =>
			line
				.trim()
				.replace(/^\|/, "")
				.replace(/\|$/, "")
				.split("|")
				.map((cell) => formatInline(cell.trim()))
		)

		const header = parsed[0] || []
		const hasDivider =
			parsed.length > 1 && parsed[1].every((cell) => /^:?-{3,}:?$/.test(cell.replace(/<[^>]+>/g, "")))
		const bodyRows = hasDivider ? parsed.slice(2) : parsed.slice(1)

		const headHtml = header.map((cell) => `<th>${cell}</th>`).join("")
		const bodyHtml = bodyRows
			.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
			.join("")

		return `
			<div class="reader-table-wrap">
				<table>
					<thead><tr>${headHtml}</tr></thead>
					<tbody>${bodyHtml}</tbody>
				</table>
			</div>
		`
	}

	// Convert lightweight markdown to HTML for the reader.
	const renderRichContent = (rawContent) => {
		if (!rawContent) {
			return "<p>No content available for this topic yet.</p>"
		}

		const codeBlocks = []
		let content = String(rawContent).replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
			const token = `@@CODE_BLOCK_${codeBlocks.length}@@`
			codeBlocks.push(
				`<pre><code class="lang-${escapeHtml(lang || "text")}">${escapeHtml(code).trim()}</code></pre>`
			)
			return token
		})

		content = escapeHtml(content)

		const lines = content.split("\n")
		const htmlParts = []
		let paragraphOpen = false
		let listType = null
		let tableRows = []

		const closeParagraph = () => {
			if (paragraphOpen) {
				htmlParts.push("</p>")
				paragraphOpen = false
			}
		}

		const closeList = () => {
			if (listType) {
				htmlParts.push(listType === "ul" ? "</ul>" : "</ol>")
				listType = null
			}
		}

		const closeTable = () => {
			if (tableRows.length) {
				htmlParts.push(renderTable(tableRows))
				tableRows = []
			}
		}

		for (const rawLine of lines) {
			const line = rawLine.trim()

			if (!line) {
				closeParagraph()
				closeList()
				closeTable()
				continue
			}

			if (/^@@CODE_BLOCK_\d+@@$/.test(line)) {
				closeParagraph()
				closeList()
				closeTable()
				htmlParts.push(line)
				continue
			}

			if (line.startsWith("|")) {
				closeParagraph()
				closeList()
				tableRows.push(line)
				continue
			}

			closeTable()

			const headingMatch = line.match(/^(#{1,4})\s+(.*)$/)
			if (headingMatch) {
				closeParagraph()
				closeList()
				const level = Math.min(4, headingMatch[1].length)
				htmlParts.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`)
				continue
			}

			const unorderedMatch = line.match(/^[-*]\s+(.*)$/)
			if (unorderedMatch) {
				closeParagraph()
				if (listType !== "ul") {
					closeList()
					htmlParts.push("<ul>")
					listType = "ul"
				}
				htmlParts.push(`<li>${formatInline(unorderedMatch[1])}</li>`)
				continue
			}

			const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
			if (orderedMatch) {
				closeParagraph()
				if (listType !== "ol") {
					closeList()
					htmlParts.push("<ol>")
					listType = "ol"
				}
				htmlParts.push(`<li>${formatInline(orderedMatch[1])}</li>`)
				continue
			}

			closeList()

			if (!paragraphOpen) {
				htmlParts.push("<p>")
				paragraphOpen = true
			} else {
				htmlParts.push("<br>")
			}

			htmlParts.push(formatInline(line))
		}

		closeParagraph()
		closeList()
		closeTable()

		let finalHtml = htmlParts.join("")
		codeBlocks.forEach((blockHtml, index) => {
			const tokenRegex = new RegExp(`@@CODE_BLOCK_${index}@@`, "g")
			finalHtml = finalHtml.replace(tokenRegex, blockHtml)
		})

		return finalHtml
	}

	// Compute label and styles for a topic item state.
	const getTopicStateMeta = (topic) => {
		if (topic.quizPassed) {
			return { label: "Completed", className: "state-completed" }
		}

		if (topic.unlocked) {
			return { label: topic.quizTaken ? "Retake Quiz" : "Ready", className: "state-ready" }
		}

		return { label: "Locked", className: "state-locked" }
	}

	// Render the list of topics in the sidebar.
	const renderTopicList = () => {
		if (!state.topics.length) {
			el.topicList.innerHTML = "<li class=\"reader-empty\">No topics available.</li>"
			return
		}

		el.topicList.innerHTML = state.topics
			.map((topic) => {
				const stateMeta = getTopicStateMeta(topic)
				const isActive = topic.id === state.activeTopicId
				const disabledAttr = topic.unlocked ? "" : "disabled"
				const lockClass = topic.unlocked ? "" : "locked"
				const activeClass = isActive ? "active" : ""

				return `
					<li>
						<button type="button" class="topic-item ${lockClass} ${activeClass}" data-topic-id="${topic.id}" ${disabledAttr}>
							<span class="topic-title">${topic.order}. ${topic.title}</span>
							<div class="topic-meta">
								<span>${topic.duration || 15} min read</span>
								<span>${topic.latestScore != null ? `${topic.latestScore}%` : "-"}</span>
							</div>
							<span class="topic-state ${stateMeta.className}">${stateMeta.label}</span>
						</button>
					</li>
				`
			})
			.join("")
	}

	// Render the active topic into the reader pane.
	const renderReader = () => {
		const topic = state.topics.find((item) => item.id === state.activeTopicId)

		if (!topic) {
			el.readerEmpty.style.display = "grid"
			el.readerContent.style.display = "none"
			return
		}

		el.readerEmpty.style.display = "none"
		el.readerContent.style.display = "grid"
		el.readerMeta.textContent = `Topic ${topic.order} • ${topic.duration || 15} min read`
		el.readerTitle.textContent = topic.title
		el.readerBody.innerHTML = renderRichContent(topic.content)

		if (!topic.unlocked || !topic.quizId) {
			el.takeQuizBtn.disabled = true
			el.takeQuizBtn.textContent = !topic.unlocked
				? "Locked"
				: "Quiz Not Available"
		} else if (topic.quizPassed) {
			el.takeQuizBtn.disabled = false
			el.takeQuizBtn.textContent = "Retake Quiz"
		} else {
			el.takeQuizBtn.disabled = false
			el.takeQuizBtn.textContent = topic.quizTaken ? "Retake Quiz" : "Take Quiz"
		}
	}

	// Update active topic selection and refresh UI.
	const setActiveTopic = (topicId) => {
		state.activeTopicId = topicId
		renderTopicList()
		renderReader()
	}

	// Attach click handlers to topic items.
	const bindTopicEvents = () => {
		el.topicList.querySelectorAll(".topic-item").forEach((button) => {
			button.addEventListener("click", () => {
				const topicId = button.getAttribute("data-topic-id")
				const topic = state.topics.find((item) => item.id === topicId)
				if (!topic || !topic.unlocked) {
					return
				}

				setActiveTopic(topicId)
			})
		})
	}

	// Populate the page with course and topic data.
	const renderAll = (payload) => {
		const userLevel = payload?.user?.assessmentLevel || "beginner"
		const course = payload?.course || {}
		state.topics = payload?.topics || []

		el.courseTitle.textContent = course.title || "Recommended Course"
		el.courseSubtitle.textContent = course.description || "No description available."
		el.summaryLevel.textContent = capitalize(userLevel)
		el.summaryProgress.textContent = `${course.progressPercent || 0}%`
		el.summaryTopics.textContent = `${course.completedTopics || 0}/${course.totalTopics || 0}`

		const requestedTopic = state.topics.find((topic) => topic.id === state.requestedTopicId)
		const firstUnlocked = state.topics.find((topic) => topic.unlocked)
		if (requestedTopic?.unlocked) {
			state.activeTopicId = requestedTopic.id
		} else if (payload?.activeTopicId) {
			state.activeTopicId = payload.activeTopicId
		} else if (firstUnlocked) {
			state.activeTopicId = firstUnlocked.id
		}

		renderTopicList()
		renderReader()
		bindTopicEvents()
	}

	// Fetch the recommended course plan for the user.
	const fetchRecommendedPlan = async (token) => {
		const query = new URLSearchParams()
		if (state.requestedCourseId) {
			query.set("courseId", state.requestedCourseId)
		}
		if (state.requestedTopicId) {
			query.set("topicId", state.requestedTopicId)
		}

		const endpoint = query.toString() ? `/course/recommended?${query.toString()}` : "/course/recommended"
		const response = await window.Api.apiRequest(endpoint, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		return response?.data || null
	}

	// Load the course plan and bind UI actions.
	const init = async () => {
		if (window.UI) {
			window.UI.renderFlashFromStorage()
		}

		const authData = window.Auth?.getAuthData()
		if (!authData?.token) {
			window.location.href = "/login?next=/courses"
			return
		}

		const params = new URLSearchParams(window.location.search)
		state.requestedCourseId = params.get("courseId") || null
		state.requestedTopicId = params.get("topicId") || null

		el.goDashboardBtn.addEventListener("click", () => {
			window.location.href = "/dashboard"
		})

		el.takeQuizBtn.addEventListener("click", () => {
			const activeTopic = state.topics.find((topic) => topic.id === state.activeTopicId)
			if (!activeTopic?.quizId || !activeTopic.unlocked) {
				return
			}

			window.location.href = `/quiz?quizId=${activeTopic.quizId}&from=courses&topicId=${activeTopic.id}`
		})

		try {
			const payload = await fetchRecommendedPlan(authData.token)
			if (!payload) {
				el.courseTitle.textContent = "Unable to load course"
				el.courseSubtitle.textContent = "No response from server. Please try again."
				return
			}

			renderAll(payload)
		} catch (error) {
			console.error("Failed to load course plan:", error)
			el.courseTitle.textContent = "Unable to load course"
			el.courseSubtitle.textContent = error?.message || "Something went wrong while loading your course."
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init)
	} else {
		init()
	}
})()
