import { loadPyodide, version } from 'pyodide'

// Load the Python runtime once when the worker starts.
const pythonReady = loadPyodide({
	indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`,
})

pythonReady
	.then(() => {
		self.postMessage({ type: 'ready' })
	})
	.catch(error => {
		self.postMessage({ type: 'error', message: error.message })
	})

// Run code received from the editor and collect its printed output.
self.onmessage = async event => {
	if (event.data.type !== 'run') {
		return
	}

	const output = []

	try {
		const python = await pythonReady

		python.setStdout({
			batched: text => output.push(text),
		})

		// Give each run its own variables.
		const globals = python.toPy({ __name__: '__main__' })

		try {
			await python.runPythonAsync(event.data.code, { globals })
		} finally {
			globals.destroy()
		}

		self.postMessage({
			type: 'result',
			output: output.join('\n'),
		})
	} catch (error) {
		self.postMessage({
			type: 'run-error',
			message: error.message,
			output: output.join('\n'),
		})
	}
}
