import { useCallback, useEffect, useRef, useState } from 'react'
import Button from './Button'

// Displays the Python editor, controls, and output; the parent supplies onClose.
export default function CodingMinigame({ onClose, onSubmit, challenge }) {
	const workerRef = useRef(null) // Current Python worker, retained between renders.
	const timeoutRef = useRef(null) // Timer used to stop long-running code.
	const [output, setOutput] = useState('') // Printed output or execution messages.
	const [isRunning, setIsRunning] = useState(false) // Controls execution-button availability.
	const [code, setCode] = useState(challenge.starterCode) // Initial editor text comes from the challenge.
	const [runtimeStatus, setRuntimeStatus] = useState('Loading Python...') // Tracks the python worker
	const [isSubmitting, setIsSubmitting] = useState(false) // Tracks an answer submission in progress.
	const [submissionMessage, setSubmissionMessage] = useState('') // Displays submission feedback.

	const startWorker = useCallback(() => { // Creates and configures the Python worker.
		// Vite resolves the worker file; module mode supports its Pyodide imports.
		const worker = new Worker(
			new URL('../workers/pythonWorker.js', import.meta.url),
			{ type: 'module' }
		)

		workerRef.current = worker

		worker.onmessage = event => { // Handles status, results, and errors sent by the worker.
			// Cancel the execution timer when the worker reports completion or an error.
			if (
				event.data.type === 'result' ||
				event.data.type === 'run-error' ||
				event.data.type === 'error'
			) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}

			if (event.data.type === 'ready') {
				setRuntimeStatus('Python is ready')
			} else if (event.data.type === 'error') {
				setRuntimeStatus(`Python failed to load: ${event.data.message}`)
			} else if (event.data.type === 'result') {
				setOutput(event.data.output || '(No output)')
				setIsRunning(false)
			} else if (event.data.type === 'run-error') {
				// Keep any printed output before the error and place the error message after it.
				setOutput(
					[event.data.output, event.data.message]
						.filter(Boolean)
						.join('\n')
				)
				setIsRunning(false)
			}
		}

		worker.onerror = () => { // Handles a failure of the worker itself.
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null

			setIsRunning(false)
			setRuntimeStatus('Python failed to load')
		}

		return worker
	}, [])

	useEffect(() => { // Starts Python when the panel mounts.
		startWorker()

		// Clear the timer and stop the active worker when the panel unmounts.
		return () => {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null

			workerRef.current?.terminate()
			workerRef.current = null
		}
	}, [startWorker])

	function runCode() { // Sends the current editor text to the worker.
		// Run requires a ready worker with no execution already in progress.
		if (!workerRef.current || isRunning || runtimeStatus !== 'Python is ready') {
			return
		}

		setOutput('')
		setIsRunning(true)

		// Reuse Stop after 10 seconds; restarting the worker leaves the editor text intact.
		timeoutRef.current = setTimeout(() => {
			stopCode('Execution timed out after 10 seconds.')
		}, 10_000)

		workerRef.current.postMessage({ type: 'run', code })
	}

	// Used by Stop and the timeout; replaces the worker while preserving editor text.
	function stopCode(message = 'Execution stopped.') {
		if (!workerRef.current) {
			return
		}

		clearTimeout(timeoutRef.current)
		timeoutRef.current = null

		workerRef.current.terminate()
		workerRef.current = null

		setIsRunning(false)
		setOutput(message)
		setRuntimeStatus('Loading Python...')

		startWorker()
	}

	function resetCode() { // Confirms edits, then restores the challenge's starter code.
		if (
			code !== challenge.starterCode &&
			!window.confirm('Reset your code? Your changes will be lost.')
		) {
			return
		}

		setCode(challenge.starterCode)
		setOutput('')
		setSubmissionMessage('')
	}

	async function submitAnswer() { // Sends the current code through the parent's submission handler.
		if (isSubmitting) {
			return
		}

		if (!code.trim()) { // Checks to see if the code contains anything except whitespace
			setSubmissionMessage('Enter some code before submitting.')
			return
		}

		if (!onSubmit) {
			setSubmissionMessage('Answer submission is unavailable.')
			return
		}

		setIsSubmitting(true)
		setSubmissionMessage('')

		try {
			await onSubmit(code) // Waits for the submission function to finish
			setSubmissionMessage('Answer submitted.')
		} catch {
			setSubmissionMessage('Could not submit your answer. Please try again.')
		} finally {
			setIsSubmitting(false)
		}
	}

	function handleCodeKeyDown(event) { // Inserts a literal tab at the current selection.
		// Leave Shift+Tab and modified keys available for normal keyboard navigation.
		if (
			event.key !== 'Tab' ||
			event.shiftKey ||
			event.ctrlKey ||
			event.altKey ||
			event.metaKey
		) {
			return
		}

		event.preventDefault()

		const editor = event.currentTarget
		const start = editor.selectionStart // Start of the caret or selected text.
		const end = editor.selectionEnd // End of the selected text.

		setCode(
			editor.value.slice(0, start) + '\t' + editor.value.slice(end)
		)

		// Restore the caret after React updates the controlled textarea.
		requestAnimationFrame(() => {
			editor.setSelectionRange(start + 1, start + 1)
		})
	}

	// State drives the editor, status, output, and controls; Close calls the parent’s onClose.
	return (
		<section className="mx-auto mt-8 max-w-3xl rounded-lg bg-slate-800 p-6 text-white">
			<h2 className="mb-4 text-2xl font-bold">
				{challenge.title}
			</h2>

			<p className="mb-4 text-slate-300">
				{challenge.description}
			</p>

			<p className="mb-4 text-sm text-slate-300">
				{runtimeStatus}
			</p>

			<label htmlFor="minigame-code" className="mb-2 block font-semibold">
				Your Python code
			</label>
			<textarea
				onKeyDown={handleCodeKeyDown}
				style={{tabSize: 4}}
				id="minigame-code"
				value={code}
				onChange={event => setCode(event.target.value)}
				spellCheck={false}
				className="mb-4 min-h-48 w-full rounded bg-slate-950 p-4 font-mono text-green-400"
			/>

			<div className="flex gap-2">
				<Button
					onClick={runCode} // Run button
					disabled={isRunning || runtimeStatus !== 'Python is ready'}
				>
					{isRunning ? 'Running...' : 'Run'}
				</Button>

				<Button onClick={() => stopCode()} disabled={!isRunning}>
					Stop
				</Button>

				<Button onClick={resetCode} disabled={isRunning}>
					Reset
				</Button>

				<Button // Submit button
					onClick={submitAnswer}
					disabled={isSubmitting || isRunning || !onSubmit}
				>
					{isSubmitting ? 'Submitting...' : 'Submit'}
				</Button>
			</div>

			<p role="status" className="mt-2 text-sm text-slate-300">
				{submissionMessage}
			</p>

			<h3 className="mb-2 mt-4 font-semibold">Output</h3>
			<pre
				aria-live="polite"
				className="mb-4 min-h-24 whitespace-pre-wrap wrap-break-word rounded bg-slate-950 p-4 font-mono"
			>
				{output}
			</pre>

			<Button onClick={onClose}>
				Close
			</Button>
		</section>
	)
}
