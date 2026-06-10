(() => {
	// Quiz runtime state stored in-memory for this page session.
	let quizState = {
		quizId: null,
		topicId: null,
		questions: [],
		currentQuestionIndex: 0,
		answers: {}, // { questionIndex: selectedOptionIndex }
		submitted: false,
		score: 0,
		level: 'beginner',
		track: 'other',
		allottedCourse: null,
		isAssessment: false,
		source: 'direct',
		currentTopicId: null,
		nextTopicId: null,
		nextTopicCourseId: null,
		nextTopicTitle: '',
	}

	// Initialize quiz data and UI.
	async function initQuiz() {
		if (window.UI) {
			window.UI.renderFlashFromStorage()
		}

		const authData = window.Auth?.getAuthData()
		if (!authData?.token) {
			window.location.href = '/login?next=/quiz'
			return
		}

		const params = new URLSearchParams(window.location.search)
		const quizId = params.get('quizId')
		const isAssessment = params.get('assessment') === 'true'
		const requestedTrack = params.get('track')
		quizState.source = params.get('from') || 'direct'
		quizState.currentTopicId = params.get('topicId') || null

		if (!quizId && !isAssessment) {
			showError('No quiz specified')
			return
		}

		try {
			showLoading()

			let endpoint = isAssessment ? '/quiz/assessment' : `/quiz/${quizId}`
			if (isAssessment && requestedTrack) {
				endpoint = `${endpoint}?track=${encodeURIComponent(requestedTrack)}`
			}
			const response = await window.Api.apiRequest(endpoint, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${authData.token}`,
				},
			})

			const quizData = response?.data?.quiz
			if (!quizData || !quizData.questions) {
				throw new Error('Invalid quiz data received')
			}

			quizState.quizId = quizData._id
			quizState.topicId = quizData.topicId || quizState.currentTopicId
			quizState.questions = quizData.questions
			quizState.isAssessment = isAssessment

			// Initialize answers object
			quizData.questions.forEach((_, idx) => {
				quizState.answers[idx] = null
			})

			renderInterface()
			displayQuestion()
		} catch (error) {
			console.error('Failed to load quiz:', error)
			showError(error?.message || 'Failed to load quiz. Please try again.')
		}
	}

	// UI state helpers for loading/quiz/results/error screens.
	function showLoading() {
		document.getElementById('loadingState').style.display = 'flex'
		document.getElementById('quizInterface').style.display = 'none'
		document.getElementById('resultsScreen').style.display = 'none'
		document.getElementById('errorState').style.display = 'none'
	}

	function showQuiz() {
		document.getElementById('loadingState').style.display = 'none'
		document.getElementById('quizInterface').style.display = 'flex'
		document.getElementById('resultsScreen').style.display = 'none'
		document.getElementById('errorState').style.display = 'none'
	}

	function showResults() {
		document.getElementById('loadingState').style.display = 'none'
		document.getElementById('quizInterface').style.display = 'none'
		document.getElementById('resultsScreen').style.display = 'flex'
		document.getElementById('errorState').style.display = 'none'
	}

	function showError(message) {
		document.getElementById('loadingState').style.display = 'none'
		document.getElementById('quizInterface').style.display = 'none'
		document.getElementById('resultsScreen').style.display = 'none'
		document.getElementById('errorState').style.display = 'flex'
		document.getElementById('errorMessage').textContent = message
	}

	// Build initial quiz UI shell.
	function renderInterface() {
		const totalQuestions = quizState.questions.length
		document.getElementById('quizTitle').textContent = quizState.isAssessment ? 'Skill Assessment' : 'Topic Quiz'

		// Initialize buttons state
		updateNavigationButtons()

		showQuiz()
	}

	// Render the current question and its options.
	function displayQuestion() {
		const question = quizState.questions[quizState.currentQuestionIndex]
		if (!question) {
			console.error('Question not found at index:', quizState.currentQuestionIndex)
			return
		}

		console.log('Displaying question:', quizState.currentQuestionIndex + 1, question.text)

		const questionNum = quizState.currentQuestionIndex + 1
		const totalQuestions = quizState.questions.length

		// Update header
		document.getElementById('questionNumber').textContent = `Question ${questionNum}`
		document.getElementById('questionCounter').textContent = `${questionNum} / ${totalQuestions}`
		const difficultyBadge = document.getElementById('difficultyBadge')
		if (difficultyBadge) {
			difficultyBadge.textContent = capitalizeFirst(question.difficulty)
			difficultyBadge.className = `difficulty-badge difficulty-${question.difficulty}`
		}

		// Update progress bar
		const progress = (questionNum / totalQuestions) * 100
		document.getElementById('progressFill').style.width = progress + '%'

		// Update question text
		document.getElementById('questionText').textContent = question.text

		// Render options
		const optionsContainer = document.getElementById('optionsContainer')
		optionsContainer.innerHTML = ''

		question.options.forEach((option, index) => {
			const isSelected = quizState.answers[quizState.currentQuestionIndex] === index
			const isAnswered = quizState.answers[quizState.currentQuestionIndex] !== null
			const shouldRevealAnswerState = quizState.submitted

			const optionDiv = document.createElement('div')
			optionDiv.className = `option`
			
			if (isSelected) optionDiv.classList.add('selected')
			if (shouldRevealAnswerState && isAnswered && isSelected && index === question.correctAnswer) optionDiv.classList.add('correct')
			if (shouldRevealAnswerState && isAnswered && isSelected && index !== question.correctAnswer) optionDiv.classList.add('incorrect')

			const optionLabel = String.fromCharCode(65 + index) // A, B, C, D
			optionDiv.innerHTML = `
				<input type="radio" name="answer" value="${index}" ${isSelected ? 'checked' : ''}>
				<span class="option-letter">${optionLabel}</span>
				<span class="option-text">${option}</span>
				${shouldRevealAnswerState && isAnswered && index === question.correctAnswer ? '<span class="option-check">✓</span>' : ''}
				${shouldRevealAnswerState && isAnswered && isSelected && index !== question.correctAnswer ? '<span class="option-cross">✗</span>' : ''}
			`

			// Attach click handler after innerHTML to ensure it's properly bound
			optionDiv.addEventListener('click', function() {
				selectOption(index)
			})

			optionsContainer.appendChild(optionDiv)
		})

		// Update explanation
		updateExplanation()
		updateAnswerIndicator()
		updateNavigationButtons()
	}

	// Update selected answer and refresh the question UI.
	function selectOption(index) {
		if (quizState.submitted) {
			return
		}

		quizState.answers[quizState.currentQuestionIndex] = index

		console.log('Option selected:', index, 'Question Index:', quizState.currentQuestionIndex)

		// Update visual feedback
		displayQuestion()

		// Show toast
		showToast('Answer selected', 'success')
	}

	// Show explanation only after submission.
	function updateExplanation() {
		if (!quizState.submitted) {
			document.getElementById('explanationBox').style.display = 'none'
			return
		}

		const isAnswered = quizState.answers[quizState.currentQuestionIndex] !== null
		const question = quizState.questions[quizState.currentQuestionIndex]

		if (!isAnswered) {
			document.getElementById('explanationBox').style.display = 'none'
			return
		}

		document.getElementById('explanationBox').style.display = 'block'

		const selectedAnswer = quizState.answers[quizState.currentQuestionIndex]
		const isCorrect = selectedAnswer === question.correctAnswer

		document.getElementById('explanationTitle').textContent = isCorrect ? '✓ Correct!' : '✗ Incorrect'
		document.getElementById('correctBadge').textContent = isCorrect ? 'Correct' : 'Wrong'
		document.getElementById('correctBadge').className = `correct-badge ${isCorrect ? 'badge-correct' : 'badge-incorrect'}`
		document.getElementById('explanationText').textContent = question.explanation || 'No explanation available.'
	}

	// Update answered count indicator.
	function updateAnswerIndicator() {
		const totalQuestions = quizState.questions.length
		let answeredCount = 0

		for (let i = 0; i < totalQuestions; i++) {
			if (quizState.answers[i] !== null) {
				answeredCount++
			}
		}

		document.getElementById('answerIndicator').textContent = `${answeredCount}/${totalQuestions} answered`
	}

	// Enable/disable navigation based on progress.
	function updateNavigationButtons() {
		const currentIndex = quizState.currentQuestionIndex
		const totalQuestions = quizState.questions.length
		const isAnswered = quizState.answers[currentIndex] !== null

		// Previous button - disabled on first question
		document.getElementById('prevBtn').disabled = currentIndex === 0

		// Next button - disabled until answer is selected
		document.getElementById('nextBtn').disabled = !isAnswered

		// Update text based on position
		if (currentIndex === totalQuestions - 1) {
			document.getElementById('nextBtn').textContent = 'Submit Quiz'
		} else {
			document.getElementById('nextBtn').textContent = 'Next →'
		}
	}

	// Expose navigation handlers for button onclick attributes.
	window.previousQuestion = function () {
		if (quizState.currentQuestionIndex > 0) {
			quizState.currentQuestionIndex--
			console.log('Moving to previous question:', quizState.currentQuestionIndex + 1)
			displayQuestion()
		}
	}

	window.nextQuestion = async function () {
		const totalQuestions = quizState.questions.length
		const isLastQuestion = quizState.currentQuestionIndex === totalQuestions - 1

		console.log('Next button clicked - Index:', quizState.currentQuestionIndex, 'Total:', totalQuestions, 'IsLast:', isLastQuestion)

		if (isLastQuestion) {
			// Last question - submit the quiz
			console.log('Submitting quiz...')
			await submitQuiz()
		} else {
			// Not last question - move to next
			if (quizState.currentQuestionIndex < totalQuestions - 1) {
				quizState.currentQuestionIndex++
				console.log('Moving to question:', quizState.currentQuestionIndex + 1)
				displayQuestion()
			}
		}
	}

	// Submit quiz results to the backend.
	async function submitQuiz() {
		const authData = window.Auth?.getAuthData()

		try {
			document.getElementById('nextBtn').disabled = true
			document.getElementById('nextBtn').textContent = 'Submitting...'

			// Calculate score
			let correctCount = 0
			quizState.questions.forEach((question, idx) => {
				if (quizState.answers[idx] === question.correctAnswer) {
					correctCount++
				}
			})

			quizState.score = Math.round((correctCount / quizState.questions.length) * 100)

			// Determine level for assessment quiz
			if (quizState.isAssessment) {
				if (quizState.score < 40) {
					quizState.level = 'beginner'
				} else if (quizState.score < 75) {
					quizState.level = 'intermediate'
				} else {
					quizState.level = 'advanced'
				}
			}

			// Prepare answers for submission
			const answerSubmission = {
				answers: quizState.answers,
				score: quizState.score,
				level: quizState.level,
			}

			const response = await window.Api.apiRequest('/quiz/submit', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authData.token}`,
				},
				body: JSON.stringify({
					quizId: quizState.quizId,
					isAssessment: quizState.isAssessment,
					...answerSubmission,
				}),
			})

			if (quizState.isAssessment) {
				quizState.level = response?.data?.level || quizState.level
				quizState.track = response?.data?.track || 'other'
				quizState.allottedCourse = response?.data?.allottedCourse || null
			}

			quizState.submitted = true

			await displayResults()
		} catch (error) {
			console.error('Failed to submit quiz:', error)
			showToast('Failed to submit quiz. Please try again.', 'error')
			document.getElementById('nextBtn').disabled = false
			document.getElementById('nextBtn').textContent = 'Submit Quiz'
		}
	}

	// Fetch the next topic suggestion after a passed quiz.
	async function loadNextTopicSuggestion() {
		quizState.nextTopicId = null
		quizState.nextTopicCourseId = null
		quizState.nextTopicTitle = ''

		if (quizState.source !== 'courses' || quizState.isAssessment) {
			return null
		}

		const authData = window.Auth?.getAuthData()
		if (!authData?.token) {
			return null
		}

		const response = await window.Api.apiRequest('/course/recommended', {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${authData.token}`,
			},
		})

		const topics = response?.data?.topics || []
		if (!topics.length) {
			return null
		}

		const currentTopicId = String(quizState.topicId || quizState.currentTopicId || '')
		const currentIndex = topics.findIndex((topic) => String(topic.id) === currentTopicId)
		if (currentIndex < 0) {
			return null
		}

		const nextTopic = topics[currentIndex + 1]
		if (nextTopic?.unlocked && nextTopic?.id) {
			quizState.nextTopicId = nextTopic.id
			quizState.nextTopicCourseId = nextTopic.courseId || null
			quizState.nextTopicTitle = nextTopic.title
			return nextTopic
		}

		return null
	}

	// Configure primary/secondary buttons on the results screen.
	function configureResultActions({ isPassed, nextTopic }) {
		const secondaryBtn = document.getElementById('resultSecondaryBtn')
		const primaryBtn = document.getElementById('resultPrimaryBtn')

		if (!secondaryBtn || !primaryBtn) {
			return
		}

		secondaryBtn.textContent = quizState.source === 'courses' ? 'Back to Courses' : 'Continue to Courses'
		secondaryBtn.onclick = () => window.goToCourses()

		if (quizState.isAssessment) {
			primaryBtn.textContent = 'Review Answers'
			primaryBtn.onclick = () => window.reviewAnswers()
			return
		}

		if (!isPassed) {
			primaryBtn.textContent = 'Retry This Quiz'
			primaryBtn.onclick = () => window.retryCurrentQuiz()
			return
		}

		if (nextTopic?.id) {
			primaryBtn.textContent = 'Read Next Topic'
			primaryBtn.onclick = () => window.goToNextTopic()
			return
		}

		primaryBtn.textContent = 'Review Answers'
		primaryBtn.onclick = () => window.reviewAnswers()
	}

	// Populate the results screen with score and next steps.
	async function displayResults() {
		const correctCount = Object.values(quizState.answers).filter((answer, idx) => {
			return answer === quizState.questions[idx].correctAnswer
		}).length

		const passingScore = Number(quizState.questions[0]?.passingScore || 70)
		const isPassed = quizState.score >= passingScore

		document.getElementById('scoreValue').textContent = quizState.score + '%'
		document.getElementById('correctValue').textContent = `${correctCount}/${quizState.questions.length}`
		document.getElementById('levelValue').textContent = capitalizeFirst(quizState.level)

		let nextTopic = null
		if (!quizState.isAssessment && isPassed) {
			try {
				nextTopic = await loadNextTopicSuggestion()
			} catch (error) {
				console.error('Failed to load next-topic suggestion:', error)
			}
		}

		if (quizState.isAssessment) {
			const trackLabel =
				quizState.track === 'dsa-cpp'
					? 'DSA C++'
					: quizState.track === 'nodejs'
						? 'Node.js Backend'
						: 'General'
			const courseLabel = quizState.allottedCourse?.title
				? `<p><strong>Allocated course:</strong> ${quizState.allottedCourse.title}</p>`
				: ''

			document.getElementById('resultsTitle').textContent = `Assessment Complete!`
			document.getElementById('resultsSubtitle').textContent = `You're placed at ${capitalizeFirst(quizState.level)} level • ${trackLabel}`
			document.getElementById('resultsIcon').textContent = '🎉'
			document.getElementById('resultsMessage').innerHTML = `
				<p>Based on your performance, we recommend the <strong>${trackLabel}</strong> track at <strong>${capitalizeFirst(quizState.level)}</strong> level.</p>
				${courseLabel}
			`
		} else {
			document.getElementById('resultsTitle').textContent = isPassed ? 'Quiz Passed!' : 'Quiz Completed'
			document.getElementById('resultsSubtitle').textContent = `You scored ${quizState.score}%`
			document.getElementById('resultsIcon').textContent = isPassed ? '✓' : '→'

			if (!isPassed) {
				document.getElementById('resultsMessage').innerHTML = `
					<p>You answered <strong>${correctCount} out of ${quizState.questions.length}</strong> questions correctly.</p>
					<p>Your score is below the passing mark. Complete this topic again and retake the quiz to unlock the next topic.</p>
				`
			} else if (nextTopic) {
				document.getElementById('resultsMessage').innerHTML = `
					<p>You answered <strong>${correctCount} out of ${quizState.questions.length}</strong> questions correctly.</p>
					<p>Great work. Next suggested topic: <strong>${nextTopic.title}</strong>.</p>
				`
			} else {
				document.getElementById('resultsMessage').innerHTML = `
					<p>You answered <strong>${correctCount} out of ${quizState.questions.length}</strong> questions correctly.</p>
					<p>Nice progress. Return to your course page to continue your learning path.</p>
				`
			}
		}

		configureResultActions({ isPassed, nextTopic })

		showResults()
	}

	window.reviewAnswers = function () {
		quizState.currentQuestionIndex = 0
		displayQuestion()
		showQuiz()
	}

	window.goToCourses = function () {
		window.location.href = '/courses'
	}

	window.retryCurrentQuiz = function () {
		window.location.href = `/quiz?quizId=${quizState.quizId}&from=${quizState.source}${quizState.currentTopicId ? `&topicId=${quizState.currentTopicId}` : ''}`
	}

	window.goToNextTopic = function () {
		if (quizState.nextTopicId) {
			const params = new URLSearchParams()
			if (quizState.nextTopicCourseId) {
				params.set('courseId', quizState.nextTopicCourseId)
			}
			params.set('topicId', quizState.nextTopicId)
			window.location.href = `/courses${params.toString() ? `?${params.toString()}` : ''}`
			return
		}

		window.location.href = '/courses'
	}

	window.goBack = function () {
		if (quizState.isAssessment) {
			window.location.href = '/dashboard'
			return
		}

		window.location.href = '/dashboard'
	}

	// Lightweight toast for transient quiz messages.
	function showToast(message, type = 'info') {
		const toast = document.getElementById('messageToast')
		toast.textContent = message
		toast.className = `message-toast show ${type}`
		setTimeout(() => {
			toast.classList.remove('show')
		}, 3000)
	}

	function capitalizeFirst(str) {
		return str.charAt(0).toUpperCase() + str.slice(1)
	}

	// Initialize when ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initQuiz)
	} else {
		initQuiz()
	}
})()
