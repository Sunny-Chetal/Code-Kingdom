import {loadPyodide, version} from 'pyodide'

// Load the Python runtime once when the worker starts.
const pythonReady = loadPyodide({
	indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`,
})

pythonReady
	.then(() => {
		self.postMessage({type: 'ready'})
	})
	.catch(error => {
		self.postMessage({type: 'error', message: error.message})
	})

// Run code received from the editor and collect its printed output.
self.onmessage = async event => {
	if (event.data.type !== 'run') {
		return
	}

	const output = [] // Collects printed lines for this run.

	try {
		const python = await pythonReady

		// Give each run its own variables.
		const globals = python.toPy({__name__: '__main__'})
		const checks = event.data.checks // Requirements supplied by the current challenge.
		python.setStdout({
			batched: text => output.push(text), // Receives printed output one line at a time.
		})

		let isCorrect = null // Runs without challenge checks remain ungraded.

		try {
			await python.runPythonAsync(event.data.code, {globals})

			if (checks) {
				// Inspect the code separately from the student's execution variables.
				const inspectionGlobals = python.toPy({
					source: event.data.code,
					required_names: checks.printedVariables ?? [], // Defaults to no required printed variables.
				})

				let structureMatches // Stores the Python structure check as a JavaScript boolean.

				try {
					structureMatches = await python.runPythonAsync(
						// This is all green because it's Python code being read inside of JavaScript
						`
import ast # Reads Python code as a tree of statements and expressions.

def check_structure(source, required_names): # Checks simple assignments and direct print calls.
    if not required_names: # Skip structural requirements when none are configured.
        return True

    assigned = set() # Unique variable names assigned so far.
    printed = set() # Assigned variables used directly as print arguments.

    for statement in ast.parse(source).body: # Inspect top-level statements in source order.
        if isinstance(statement, ast.Assign):
            for target in statement.targets:
                if not isinstance(target, ast.Name): # Only simple variable targets are supported.
                    return False
                assigned.add(target.id)

        elif isinstance(statement, ast.Expr):
            call = statement.value # An expression statement may contain a function call.

            if not (
                isinstance(call, ast.Call)
                and isinstance(call.func, ast.Name)
                and call.func.id == "print"
            ):
                return False

            for argument in call.args: # Count named arguments only after their assignment.
                if isinstance(argument, ast.Name) and argument.id in assigned:
                    printed.add(argument.id)

        else:
            return False

    return all(name in printed for name in required_names) # Every required name must qualify.

check_structure(source, required_names)
`, {globals: inspectionGlobals})
				} finally {
					inspectionGlobals.destroy() // Releases the temporary Python inspection namespace.
				}
				// Compare each required variable with its expected value.
				const variablesMatch = Object.entries(checks.variables).every(
					([name, expectedValue]) => {
						if (!globals.has(name)) {
							return false
						}

						const actualValue = globals.get(name)

						try {
							return actualValue === expectedValue
						} finally {
							// Release Python objects returned through Pyodide.
							actualValue?.destroy?.()
						}
					}
				)

				const outputMatches = output.join('\n').trim() === checks.output
				isCorrect = structureMatches && variablesMatch && outputMatches // All three checks must pass.
			}
		} finally {
			globals.destroy() // Releases this run's Python variables, even after an error.
		}

		self.postMessage({
			type: 'result',
			output: output.join('\n'),
			isCorrect,
		})
	} catch (error) {
		self.postMessage({
			type: 'run-error',
			message: error.message,
			output: output.join('\n'),
		})
	}
}
