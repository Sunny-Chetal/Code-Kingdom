const API_BASE_URL = 'http://127.0.0.1:8000/api'

function getLoginApiBaseUrl() {
    return window.location.protocol + '//' + window.location.hostname + ':8002/api'
}

export async function getBackendHealth(signal) {
    const response = await fetch(`${API_BASE_URL}/health`, {signal})
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
    }
    return response.json()
}

export async function submitChallengeAnswer(challengeId, code) {
    const response = await fetch(`${API_BASE_URL}/challenge-submissions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({challenge_id: challengeId, code}),
    })
    if (!response.ok) {
        throw new Error('Answer submission failed')
    }
    return response.json()
}


//Kingdom State
export async function getKingdomState(signal){
        const response = await fetch(getLoginApiBaseUrl() + '/kingdom-state', {
            credentials: 'include', signal, cache: 'no-store'})
    if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const detail = Array.isArray(body.detail)
            ? body.detail.map(problem => problem.loc.at(-1) + ': ' + problem.msg).join(', ')
            : body.detail
        const error = new Error(detail || 'HTTP ' + response.status)
        error.status = response.status
        throw error
    }
    return response.json()
}

//Save the user's current resources and buildings
export async function saveKingdomState(state, signal){
    const response = await fetch(getLoginApiBaseUrl() + '/kingdom-state', {
        method: 'PUT',
        credentials: 'include',
        signal,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({resources: state.resources, buildings: state.buildings}),
    })
    if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const detail = Array.isArray(body.detail)
            ? body.detail.map(problem => problem.loc.at(-1) + ': ' + problem.msg).join(', ')
            : body.detail
        const error = new Error(detail || 'HTTP ' + response.status)
        error.status = response.status
        throw error
    }
    return response.json()
}

// ---------- Tutorial completion progress ----------

async function tutorialProgressRequest(options = {}) {
    const response = await fetch(getLoginApiBaseUrl() + '/tutorial-progress', {
        credentials: 'include',
        ...options,
    })
    if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const detail = Array.isArray(body.detail)
            ? body.detail.map(problem => problem.loc.at(-1) + ': ' + problem.msg).join(', ')
            : body.detail
        throw new Error(detail || 'HTTP ' + response.status)
    }
    return response.json()
}

export function getTutorialProgress() {
    return tutorialProgressRequest()
}

export function markTutorialCompleted(tutorialId) {
    return tutorialProgressRequest({
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({tutorial_id: tutorialId}),
    })
}

// ---------- Minigame completion progres ----------

async function minigameProgressRequest(options = {}){
	const response = await fetch(getLoginApiBaseUrl() + '/minigame-progress', {
        credentials: 'include',
        ...options,
    })
	if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const detail = Array.isArray(body.detail)
            ? body.detail.map(problem => problem.loc.at(-1) + ': ' + problem.msg).join(', ')
            : body.detail
        throw new Error(detail || 'HTTP ' + response.status)
    }
    return response.json()
}

export function getMinigameProgress() {
    return minigameProgressRequest()
}

export function markMinigameCompleted(minigameId) {
    return minigameProgressRequest({
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({minigame_id: minigameId}),
    })
}

// ---------- Coding questions (administrator question management) ----------

async function questionRequest(path, options = {}) { // Sends a request and turns API errors into readable messages.
	const response = await fetch(`${API_BASE_URL}/coding-questions${path}`, {
		headers: {'Content-Type': 'application/json'},
		...options,
	})
	if (!response.ok) {
		const body = await response.json().catch(() => ({}))
		const detail = Array.isArray(body.detail)
			? body.detail.map(problem => `${problem.loc.at(-1)}: ${problem.msg}`).join(', ')
			: body.detail
		throw new Error(detail || `HTTP ${response.status}`)
	}
	return response.status === 204 ? null : response.json()
}

export function getCodingQuestions() {
	return questionRequest('')
}

// Questions for the student's current tier, worked out from the challenges they have completed.
export function getProgressionQuestions(completedIds) {
	const params = new URLSearchParams()
	completedIds.forEach(id => params.append('completed', id))
	return questionRequest(`/progression?${params}`)
}

export function createCodingQuestion(question) {
	return questionRequest('', {method: 'POST', body: JSON.stringify(question)})
}

export function updateCodingQuestion(id, changes) {
	return questionRequest(`/${id}`, {method: 'PATCH', body: JSON.stringify(changes)})
}

export function deleteCodingQuestion(id) {
	return questionRequest(`/${id}`, {method: 'DELETE'})
}
