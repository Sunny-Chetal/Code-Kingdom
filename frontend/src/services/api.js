const API_BASE_URL = 'http://127.0.0.1:8000/api'

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

export function createCodingQuestion(question) {
	return questionRequest('', {method: 'POST', body: JSON.stringify(question)})
}

export function updateCodingQuestion(id, changes) {
	return questionRequest(`/${id}`, {method: 'PATCH', body: JSON.stringify(changes)})
}

export function deleteCodingQuestion(id) {
	return questionRequest(`/${id}`, {method: 'DELETE'})
}
