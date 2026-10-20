import { useCallback, useEffect, useRef, useState } from 'react'
import Button from './Button'

const STARTER_CODE = 'gold = 100\nprint(gold)'

// Displays the minigame panel; the parent controls when it opens and closes.
export default function CodingMinigame({ onClose }) {
	const workerRef = useRef(null)
	const timeoutRef = useRef(null)
	const [output, setOutput] = useState('')
	const [isRunning, setIsRunning] = useState(false)
	const [code, setCode] = useState(STARTER_CODE)
	const [runtimeStatus, setRuntimeStatus] = useState('Loading Python...')

	// Start Python when the panel opens and stop the worker when it closes.
	const startWorker = useCallback(() => {
		const worker = new Worker(
			new URL('../workers/pythonWorker.js', import.meta.url),
			{ type: 'module' }
		)

		workerRef.current = worker

		worker.onmessage = event => {
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
				setOutput(
					[event.data.output, event.data.message]
						.filter(Boolean)
						.join('\n')
				)
				setIsRunning(false)
			}
		}

		worker.onerror = () => {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null

			setIsRunning(false)
			setRuntimeStatus('Python failed to load')
		}

		return worker
	}, [])

	// Clean up the current worker, including one created after stopping.
	useEffect(() => {
		startWorker()

		return () => {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null

			workerRef.current?.terminate()
			workerRef.current = null
		}
	}, [startWorker])

	// Send the editor's current code to the Python worker.
	function runCode() {
		if (!workerRef.current || isRunning || runtimeStatus !== 'Python is ready') {
			return
		}

		setOutput('')
		setIsRunning(true)
		timeoutRef.current = setTimeout(() => {
			stopCode('Execution timed out after 10 seconds.')
		}, 10_000)

		workerRef.current.postMessage({ type: 'run', code })
	}

	// Stop execution and prepare a fresh Python runtime.
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

	function resetCode() {
		if (
			code !== STARTER_CODE &&
			!window.confirm('Reset your code? Your changes will be lost.')
		) {
			return
		}

		setCode(STARTER_CODE)
		setOutput('')
	}

	// Insert a tab instead of moving focus out of the editor.
	function handleCodeKeyDown(event) {
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
		const start = editor.selectionStart
		const end = editor.selectionEnd

		setCode(
			editor.value.slice(0, start) + '\t' + editor.value.slice(end)
		)

		requestAnimationFrame(() => {
			editor.setSelectionRange(start + 1, start + 1)
		})
	}

	return (
		<section className="mx-auto mt-8 max-w-3xl rounded-lg bg-slate-800 p-6 text-white">
			<h2 className="mb-4 text-2xl font-bold">
				Coding Minigame
			</h2>

			<p className="mb-4 text-slate-300">
				Practice your Python skills to help your kingdom grow.
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
					onClick={runCode}
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
			</div>

			<h3 className="mb-2 mt-4 font-semibold">Output</h3>
			<pre
				aria-live="polite"
				className="mb-4 min-h-24 whitespace-pre-wrap break-words rounded bg-slate-950 p-4 font-mono"
			>
				{output}
			</pre>

			<Button onClick={onClose}>
				Close
			</Button>
		</section>
	)
}
