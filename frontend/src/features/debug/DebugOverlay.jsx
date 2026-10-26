import {useEffect, useState} from 'react'
import BackendStatus from './BackendStatus'

export default function DebugOverlay() {
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		function toggleDebug(event) {
			// DEBUG SHORTCUT: Alt+C toggles connection information.
			const isShortcut =
				event.altKey &&
				event.code === 'KeyC' &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.shiftKey

			if (!isShortcut || event.repeat) {
				return
			}

			// Preserve typing shortcuts inside editors and form controls.
			if (event.target.closest?.(
				'input, textarea, select, [contenteditable="true"]'
			)) {
				return
			}

			event.preventDefault()
			setIsVisible(previous => !previous)
		}

		window.addEventListener('keydown', toggleDebug)

		return () => window.removeEventListener('keydown', toggleDebug)
	}, [])

	if (!isVisible) {
		return null
	}

	return (
		<aside
			aria-label="Debug connection status"
			className="pointer-events-none fixed left-4 top-4 z-50 rounded border border-slate-600 bg-slate-950/90 px-4 py-3 text-sm text-white"
		>
			<BackendStatus />
		</aside>
	)
}