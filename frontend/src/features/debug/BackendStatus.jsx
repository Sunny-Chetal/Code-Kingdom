import {useEffect, useState} from 'react'
import {getBackendHealth} from '../../services/api'

export default function BackendStatus() {
	const [backendStatus, setBackendStatus] = useState('Checking...')

	useEffect(() => {
		const controller = new AbortController()

		async function checkBackend() {
			try {
				const data = await getBackendHealth(controller.signal)

				setBackendStatus(
					`Backend: ${data.status} | Database: ${data.database}`
				)
			} catch (error) {
				if (error.name !== 'AbortError') {
					setBackendStatus('Backend connection failed')
					console.error(error)
				}
			}
		}

		checkBackend()

		return () => controller.abort()
	}, [])

	return (
		<p className="mb-4 text-center">
			{backendStatus}
		</p>
	)
}
