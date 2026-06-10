(() => {
	// Require auth before showing dashboard.
	if (!window.Auth) {
		window.location.href = "/login"
		return
	}

	// Redirect to login if no token is present.
	const authData = window.Auth.getAuthData()
	if (!authData?.token) {
		const nextPath = encodeURIComponent("/dashboard")
		window.location.href = `/login?next=${nextPath}`
		return
	}

	// Show any pending flash message.
	if (window.UI) {
		window.UI.renderFlashFromStorage()
	}

	const fallbackName = authData.user?.name || "Learner"
	const heroUserName = document.getElementById("heroUserName")
	const heroSubtitle = document.getElementById("heroSubtitle")
	const topUserName = document.getElementById("topUserName")
	if (heroUserName) {
		heroUserName.textContent = fallbackName
	}
	if (topUserName) {
		topUserName.textContent = fallbackName
	}

	const logoutButton = document.getElementById("logoutButton")
	if (logoutButton) {
		logoutButton.addEventListener("click", async () => {
			logoutButton.disabled = true

			try {
				if (window.Api) {
					await window.Api.apiRequest("/auth/logout", {
						method: "POST",
						headers: {
							Authorization: `Bearer ${authData.token}`,
						},
					})
				}
			} catch (_error) {
				// Client-side logout should still proceed even if the API call fails.
			} finally {
				window.Auth.clearAuthData()
				if (window.UI) {
					window.UI.setFlashMessage("Logged out successfully.", "success")
				}
				window.location.href = "/login"
			}
		})
	}

	const newPathButton = document.getElementById("newPathButton")
	if (newPathButton) {
		newPathButton.addEventListener("click", () => {
			window.location.href = "/path"
		})
	}

	// Normalize numeric values from API payloads.
	const toInt = (value) => {
		const parsed = Number(value)
		return Number.isFinite(parsed) ? Math.round(parsed) : 0
	}

	let activityChart = null
	let transformationChart = null
	let difficultyChart = null

	const setText = (id, value) => {
		const element = document.getElementById(id)
		if (element) {
			element.textContent = value
		}
	}

	const escapeHtml = (value) => {
		return String(value || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\"/g, "&quot;")
			.replace(/'/g, "&#39;")
	}

	// Render the learning activity line chart.
	const renderActivity = (activity = []) => {
		if (!window.Chart) {
			return
		}

		const labels = activity.map((item) => item?.label || "")
		const values = activity.map((item) => toInt(item?.value || 0))
		const canvas = document.getElementById("activityChart")
		if (!canvas) {
			return
		}

		const context = canvas.getContext("2d")
		if (!context) {
			return
		}

		if (activityChart) {
			activityChart.data.labels = labels
			activityChart.data.datasets[0].data = values
			activityChart.options.scales.y.max = Math.max(4, ...values, 1)
			activityChart.update()
			return
		}

		activityChart = new window.Chart(context, {
			type: "line",
			data: {
				labels,
				datasets: [
					{
						label: "Completions",
						data: values,
						borderColor: "#7b74de",
						backgroundColor: (chartContext) => {
							const { chart } = chartContext
							const { ctx, chartArea } = chart

							if (!chartArea) {
								return "rgba(123, 116, 222, 0.24)"
							}

							const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
							gradient.addColorStop(0, "rgba(123, 116, 222, 0.34)")
							gradient.addColorStop(1, "rgba(123, 116, 222, 0)")
							return gradient
						},
						fill: true,
						tension: 0.35,
						pointRadius: 0,
						pointHoverRadius: 4,
						borderWidth: 3,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false,
					},
					tooltip: {
						backgroundColor: "#0f111a",
						titleColor: "#f4f6ff",
						bodyColor: "#c7cbdb",
						borderColor: "#2f3345",
						borderWidth: 1,
						displayColors: false,
					},
				},
				scales: {
					x: {
						grid: {
							display: false,
						},
						ticks: {
							color: "#6f758f",
							font: {
								size: 11,
							},
						},
						border: {
							display: false,
						},
					},
					y: {
						min: 0,
						max: Math.max(4, ...values, 1),
						ticks: {
							stepSize: 1,
							color: "#6f758f",
							font: {
								size: 12,
							},
						},
						grid: {
							color: "rgba(140, 145, 166, 0.14)",
						},
						border: {
							display: false,
						},
					},
				},
			},
		})
	}

	// Render the transformation comparison chart.
	const renderTransformation = (transformation = {}) => {
		if (!window.Chart) {
			return
		}

		const items = Array.isArray(transformation.items) ? transformation.items : []
		const labels = items.map((item) => item?.title || "Path")
		const startedValues = items.map((item) => toInt(item?.started || 0))
		const currentValues = items.map((item) => toInt(item?.current || 0))

		const avgGain = toInt(transformation.avgGain)
		const avgElement = document.getElementById("avgGainValue")
		if (avgElement) {
			avgElement.textContent = `${avgGain >= 0 ? "+" : ""}${avgGain}%`
			avgElement.style.color = avgGain < 0 ? "#ef6b78" : "#1dc28d"
		}

		const canvas = document.getElementById("transformationChart")
		if (!canvas) {
			return
		}

		const context = canvas.getContext("2d")
		if (!context) {
			return
		}

		if (transformationChart) {
			transformationChart.data.labels = labels
			transformationChart.data.datasets[0].data = startedValues
			transformationChart.data.datasets[1].data = currentValues
			transformationChart.update()
		} else {
			transformationChart = new window.Chart(context, {
				type: "bar",
				data: {
					labels,
					datasets: [
						{
							label: "Started",
							data: startedValues,
							backgroundColor: "#7c7f8b",
							borderRadius: 6,
							barPercentage: 0.55,
							categoryPercentage: 0.58,
						},
						{
							label: "Now",
							data: currentValues,
							backgroundColor: "#8278e7",
							borderRadius: 6,
							barPercentage: 0.55,
							categoryPercentage: 0.58,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: false,
						},
						tooltip: {
							backgroundColor: "#0f111a",
							titleColor: "#f4f6ff",
							bodyColor: "#c7cbdb",
							borderColor: "#2f3345",
							borderWidth: 1,
						},
					},
					scales: {
						x: {
							grid: {
								display: false,
							},
							ticks: {
								color: "#7f87a3",
								font: { size: 12 },
								maxRotation: 0,
								callback(value) {
									const raw = this.getLabelForValue(value)
									return raw.length > 16 ? `${raw.slice(0, 13)}...` : raw
								},
							},
							border: { display: false },
						},
						y: {
							min: 0,
							max: 100,
							ticks: {
								stepSize: 25,
								color: "#6f758f",
							},
							grid: {
								color: "rgba(140, 145, 166, 0.14)",
							},
							border: { display: false },
						},
					},
				},
			})
		}

		const legend = document.getElementById("transformationLegend")
		if (legend) {
			legend.innerHTML = items
				.slice(0, 4)
				.map((item) => {
					const gain = toInt(item?.gain)
					const gainLabel = `${gain >= 0 ? "+" : ""}${gain}`
					return `<article class="transform-item">
						<strong>${escapeHtml(item?.title)}</strong>
						<p>${toInt(item?.started)}% -> <b>${toInt(item?.current)}%</b></p>
						<span class="gain">${gainLabel}</span>
					</article>`
				})
				.join("")
		}
	}

	// Render topic difficulty distribution chart.
	const renderDifficulty = (difficulty = {}) => {
		if (!window.Chart) {
			return
		}

		const beginner = toInt(difficulty.beginner)
		const intermediate = toInt(difficulty.intermediate)
		const advanced = toInt(difficulty.advanced)
		const values = [beginner, intermediate, advanced]

		setText("difficultyBeginner", beginner)
		setText("difficultyIntermediate", intermediate)
		setText("difficultyAdvanced", advanced)

		const canvas = document.getElementById("difficultyChart")
		if (!canvas) {
			return
		}

		const context = canvas.getContext("2d")
		if (!context) {
			return
		}

		if (difficultyChart) {
			difficultyChart.data.datasets[0].data = values
			difficultyChart.update()
			return
		}

		difficultyChart = new window.Chart(context, {
			type: "bar",
			data: {
				labels: ["Beginner", "Intermediate", "Advanced"],
				datasets: [
					{
						data: values,
						backgroundColor: ["#1dc28d", "#4f8cff", "#8176e5"],
						borderRadius: 8,
						barPercentage: 0.56,
						categoryPercentage: 0.68,
					},
				],
			},
			options: {
				indexAxis: "y",
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false,
					},
					tooltip: {
						backgroundColor: "#0f111a",
						titleColor: "#f4f6ff",
						bodyColor: "#c7cbdb",
						borderColor: "#2f3345",
						borderWidth: 1,
						displayColors: false,
					},
				},
				scales: {
					x: {
						min: 0,
						max: Math.max(4, ...values, 1),
						ticks: {
							stepSize: 1,
							color: "#7f87a3",
						},
						grid: {
							color: "rgba(140, 145, 166, 0.14)",
						},
						border: { display: false },
					},
					y: {
						ticks: {
							color: "#9ca3b8",
							font: { size: 13 },
						},
						grid: {
							display: false,
						},
						border: { display: false },
					},
				},
			},
		})
	}

	// Render the learning paths grid.
	const renderPaths = (paths = []) => {
		const list = Array.isArray(paths) ? paths : []
		setText("pathsTotal", list.length)

		const grid = document.getElementById("pathsGrid")
		if (!grid) {
			return
		}

		if (!list.length) {
			grid.innerHTML = `<article class="path-card"><div class="path-top"><h4>No paths yet</h4></div><div class="path-meta">Start a learning path to see progress here.</div></article>`
			return
		}

		grid.innerHTML = list
			.slice(0, 6)
			.map((item) => {
				const completion = Math.max(0, Math.min(100, toInt(item?.completion)))
				const level = String(item?.level || "beginner").toUpperCase()
				const resumeTarget = item?.resumeTarget || null
				const isResumeable = Boolean(resumeTarget?.courseId && resumeTarget?.topicId)
				const buttonLabel = completion >= 100 ? "Review path" : "Continue learning"
				return `<article class="path-card">
					<div class="path-top">
						<h4>${escapeHtml(item?.title || "Untitled path")}</h4>
						<span class="path-level">${escapeHtml(level)}</span>
					</div>
					<div class="path-bar"><span style="width:${completion}%"></span></div>
					<div class="path-meta">
						<span>${completion}% complete</span>
						<span><b>${toInt(item?.current)}%</b> now</span>
					</div>
					<div class="path-actions">
						<button
							type="button"
							class="path-continue-btn"
							data-course-id="${escapeHtml(resumeTarget?.courseId || item?.id || "")}"
							data-topic-id="${escapeHtml(resumeTarget?.topicId || "")}"${isResumeable ? "" : " disabled"}
						>
							${buttonLabel}
						</button>
					</div>
				</article>`
			})
			.join("")

		grid.querySelectorAll(".path-continue-btn").forEach((button) => {
			button.addEventListener("click", () => {
				if (button.disabled) {
					return
				}

				const courseId = button.getAttribute("data-course-id")
				const topicId = button.getAttribute("data-topic-id")
				const params = new URLSearchParams()
				if (courseId) params.set("courseId", courseId)
				if (topicId) params.set("topicId", topicId)
				window.location.href = `/courses${params.toString() ? `?${params.toString()}` : ""}`
			})
		})
	}

	// Populate all dashboard widgets.
	const renderDashboard = (payload = {}) => {
		const safeName = payload.userName || fallbackName
		if (heroUserName) {
			heroUserName.textContent = safeName
		}
		if (topUserName) {
			topUserName.textContent = safeName
		}

		if (heroSubtitle) {
			const rawTrack = String(payload.recommendedTrack || "other").toLowerCase()
			const trackLabel =
				rawTrack === "dsa-cpp"
					? "DSA C++"
					: rawTrack === "nodejs"
						? "Node.js Backend"
						: "General"
			heroSubtitle.textContent = `Allocated track: ${trackLabel}`
		}

		const stats = payload.stats || {}
		const overall = payload.overallProgress || {}

		const activePaths = toInt(stats.activePaths)
		const topicsMastered = toInt(stats.topicsMastered)
		const totalTopics = toInt(stats.totalTopics)
		const quizzesSolved = toInt(stats.quizzesSolved)
		const averageScore = toInt(stats.averageScore)
		const dayStreak = toInt(stats.dayStreak)

		const finishedPaths = toInt(overall.finished)
		const inProgressPaths = toInt(overall.inProgress)
		const percentage = Math.max(0, Math.min(100, toInt(overall.percentage)))

		setText("statActivePaths", activePaths)
		setText("statActivePathsMeta", `${totalTopics} topics`)
		setText("statTopicsMastered", topicsMastered)
		setText("statTotalTopics", totalTopics)
		setText("statTopicsMeta", `${finishedPaths} paths done`)
		setText("statQuizzesSolved", quizzesSolved)
		setText("statAverageScore", averageScore)
		setText("statDayStreak", dayStreak)
		setText("statStreakMeta", dayStreak > 0 ? "keep going" : "start today")

		setText("overallPercent", `${percentage}%`)
		setText("finishedPaths", finishedPaths)
		setText("inProgressPaths", inProgressPaths)

		const ring = document.getElementById("overallRing")
		if (ring) {
			ring.style.setProperty("--progress", `${percentage}`)
		}

		renderActivity(payload.learningActivity || [])
		renderTransformation(payload.transformation || {})
		renderDifficulty(payload.topicsByDifficulty || {})
		renderPaths(payload.learningPaths || [])
	}

	// Provide a safe fallback when API fails.
	const setFallbackState = () => {
		renderDashboard({
			userName: fallbackName,
			stats: {
				activePaths: 0,
				topicsMastered: 0,
				totalTopics: 0,
				quizzesSolved: 0,
				averageScore: 0,
				dayStreak: 0,
			},
			overallProgress: {
				percentage: 0,
				finished: 0,
				inProgress: 0,
			},
			learningActivity: Array.from({ length: 14 }).map((_, index) => {
				const d = new Date()
				d.setDate(d.getDate() - (13 - index))
				return {
					label: `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.getDate()}`,
					value: 0,
				}
			}),
			transformation: {
				avgGain: 0,
				items: [],
			},
			topicsByDifficulty: {
				beginner: 0,
				intermediate: 0,
				advanced: 0,
			},
			learningPaths: [],
		})
	}

	// Fetch dashboard data from the API.
	const loadDashboard = async () => {
		try {
			const response = await window.Api.apiRequest("/progress/dashboard", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authData.token}`,
				},
			})

			renderDashboard(response?.data || {})
		} catch (_error) {
			setFallbackState()
		}
	}

	setFallbackState()
	loadDashboard()
})()
