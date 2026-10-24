import { useCallback, useEffect, useRef, useState } from 'react'
import Button from './Button'

// Displays the Python editor, controls, and output; the parent supplies onClose.
export default function CodingMinigame({ onClose, onSubmit, challenge }) {
	const workerRef = useRef(null) // Current Python worker, retained between renders.
	const timeoutRef = useRef(null) // Timer used to stop long-running code.
	const pendingGradeRef = useRef(null) // Holds the waiting submission's grading callbacks.
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
				if (pendingGradeRef.current) {
					pendingGradeRef.current.reject(new Error(event.data.message))
					pendingGradeRef.current = null
				}

				setIsRunning(false)
				setRuntimeStatus(`Python failed to load: ${event.data.message}`)
			} else if (event.data.type === 'result') {
				setOutput(event.data.output || '(No output)')

				// Return the grading result to a waiting submission.
				if (pendingGradeRef.current) {
					pendingGradeRef.current.resolve(event.data.isCorrect)
					pendingGradeRef.current = null
				}

				if (event.data.isCorrect !== null) {
					setSubmissionMessage(
						event.data.isCorrect
							? 'Your answer is correct.'
							: 'Your answer is not correct yet.'
					)
				}

				setIsRunning(false)
			} else if (event.data.type === 'run-error') {
				// Tell a waiting submission that Python execution failed.
				if (pendingGradeRef.current) {
					pendingGradeRef.current.reject(new Error(event.data.message))
					pendingGradeRef.current = null
				}

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

			if (pendingGradeRef.current) {
				pendingGradeRef.current.reject(new Error('Python worker failed.'))
				pendingGradeRef.current = null
			}

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

			if (pendingGradeRef.current) {
				pendingGradeRef.current.reject(new Error('The editor was closed.'))
				pendingGradeRef.current = null
			}

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
		setSubmissionMessage('')
		setIsRunning(true)

		// Reuse Stop after 10 seconds; restarting the worker leaves the editor text intact.
		timeoutRef.current = setTimeout(() => {
			stopCode('Execution timed out after 10 seconds.')
		}, 10_000)

		// Send the code and the current challenge's grading requirements.
		workerRef.current.postMessage({
			type: 'run',
			code,
			checks: challenge.checks,
		})
	}

	function gradeAnswer() { // Runs the current answer and waits for its grade.
		if (
			!workerRef.current ||
			isRunning ||
			pendingGradeRef.current ||
			runtimeStatus !== 'Python is ready'
		) {
			return Promise.reject(new Error('Python is not ready to grade.'))
		}

		return new Promise((resolve, reject) => {
			pendingGradeRef.current = { resolve, reject }

			try {
				runCode()
			} catch (error) {
				pendingGradeRef.current = null
				reject(error)
			}
		})
	}

	// Used by Stop and the timeout; replaces the worker while preserving editor text.
	function stopCode(message = 'Execution stopped.') {
		// End a waiting submission when execution is stopped or times out.
		if (pendingGradeRef.current) {
			pendingGradeRef.current.reject(new Error(message))
			pendingGradeRef.current = null
		}

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

	async function submitAnswer() { // Grades the current answer, then stores it.
		if (isSubmitting || isRunning) {
			return
		}

		if (!code.trim()) {
			setSubmissionMessage('Enter some code before submitting.')
			return
		}

		if (!onSubmit) {
			setSubmissionMessage('Answer submission is unavailable.')
			return
		}

		if (!challenge.checks) {
			setSubmissionMessage('Grading is unavailable for this challenge.')
			return
		}

		setIsSubmitting(true)
		setSubmissionMessage('')

		try {
			let isCorrect

			try {
				isCorrect = await gradeAnswer()
			} catch {
				setSubmissionMessage(
					'Could not grade your answer. Check the output and try again.'
				)
				return
			}

			if (typeof isCorrect !== 'boolean') {
				setSubmissionMessage('No grading result was returned. Please try again.')
				return
			}

			await onSubmit(code)

			setSubmissionMessage(
				isCorrect
					? 'Answer submitted. Your answer is correct.'
					: 'Answer submitted. Your answer is not correct yet.'
			)
		} catch {
			setSubmissionMessage('Could not submit your answer. Please try again.')
		} finally {
			setIsSubmitting(false)
		}
	}

	function updateCode(nextCode) { // Clears feedback when the answer changes.
		setCode(nextCode)
		setSubmissionMessage('')
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

		updateCode(
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
				disabled={isRunning || isSubmitting}
				onChange={event => updateCode(event.target.value)}
				spellCheck={false}
				className="mb-4 min-h-48 w-full rounded bg-slate-950 p-4 font-mono text-green-400"
			/>

			<div className="flex gap-2">
				<Button
					onClick={runCode} // Run button
					disabled={isRunning || isSubmitting || runtimeStatus !== 'Python is ready'}
				>
					{isRunning ? 'Running...' : 'Run'}
				</Button>

				<Button onClick={() => stopCode()} disabled={!isRunning}>
					Stop
				</Button>

				<Button onClick={resetCode} disabled={isRunning || isSubmitting}>
					Reset
				</Button>

				<Button // Submit button
					onClick={submitAnswer}
					disabled={
						isSubmitting ||
						isRunning ||
						!onSubmit ||
						runtimeStatus !== 'Python is ready'
					}
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
