(() => {
	// Cache DOM references for navigation and hero interactions.
	const menuToggle = document.getElementById("menuToggle")
	const navLinks = document.getElementById("siteNavLinks")
	const quizOptionsWrap = document.getElementById("quizOptions")
	const heroTrackTopic = document.getElementById("heroTrackTopic")
	const navSectionLinks = document.querySelectorAll("[data-nav-section]")
	const topics = [
		"DSA with C++",
		"Node.js Backend",
		"System Design",
		"React & Frontend",
		"Python ML",
	]

	// Toggle mobile navigation visibility.
	if (menuToggle && navLinks) {
		menuToggle.addEventListener("click", () => {
			const isOpen = navLinks.classList.toggle("open")
			menuToggle.setAttribute("aria-expanded", String(isOpen))
		})

		navLinks.querySelectorAll("a").forEach((link) => {
			link.addEventListener("click", () => {
				navLinks.classList.remove("open")
				menuToggle.setAttribute("aria-expanded", "false")
			})
		})
	}

	// Allow selecting a quiz option card.
	if (quizOptionsWrap) {
		quizOptionsWrap.querySelectorAll(".qp-opt").forEach((option) => {
			option.addEventListener("click", () => {
				quizOptionsWrap.querySelectorAll(".qp-opt").forEach((item) => {
					item.classList.remove("selected")
				})
				option.classList.add("selected")
			})
		})
	}

	// Rotate hero topic text to create motion.
	if (heroTrackTopic) {
		let topicIndex = 0
		heroTrackTopic.textContent = topics[topicIndex]

		setInterval(() => {
			heroTrackTopic.classList.add("is-changing")

			setTimeout(() => {
				topicIndex = (topicIndex + 1) % topics.length
				heroTrackTopic.textContent = topics[topicIndex]
				heroTrackTopic.classList.remove("is-changing")
			}, 220)
		}, 2500)
	}

	// Highlight the active section in the nav on scroll.
	if (navSectionLinks.length) {
		const sectionMap = {}
		navSectionLinks.forEach((link) => {
			const sectionId = link.dataset.navSection
			if (sectionId) {
				sectionMap[sectionId] = link
			}
		})

		const sections = Object.keys(sectionMap)
			.map((id) => document.getElementById(id))
			.filter(Boolean)

		function setActive(sectionId) {
			navSectionLinks.forEach((link) => link.classList.remove("active"))
			if (sectionMap[sectionId]) {
				sectionMap[sectionId].classList.add("active")
			}
		}

		if (sections.length) {
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							setActive(entry.target.id)
						}
					})
				},
				{ rootMargin: "-45% 0px -45% 0px", threshold: 0.01 },
			)

			sections.forEach((section) => observer.observe(section))
		}
	}
})()
