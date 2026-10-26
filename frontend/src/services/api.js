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
