import { useState } from 'react'
import Button from './Button'

const lessons = [
	{
		title: 'Introduction to Variables',
		explanation: 'Variables store information in a program. You can use a variable to track how much gold your kingdom has.',
		code: 'gold = 100\nprint(gold)',
	},
	{
		title: 'Updating Variables',
		explanation: 'You can update a variable when its value changes. Here, your kingdom earns 25 gold.',
		code: 'gold = 100\ngold = gold + 25\nprint(gold)',
	},
]

export default function Tutorial() {
	const [currentStep, setCurrentStep] = useState(0)
	const lesson = lessons[currentStep]

	return (
		<section className="mx-auto mt-8 max-w-3xl rounded-lg bg-slate-800 p-6 text-white">
			<h2 className="mb-4 text-2xl font-bold">Programming Tutorial</h2>
			<h3 className="mb-2 text-xl font-semibold">{lesson.title}</h3>
			<p className="mb-4 text-slate-300">{lesson.explanation}</p>

			<pre className="mb-4 overflow-x-auto rounded bg-slate-950 p-4 text-green-400">
				<code>{lesson.code}</code>
			</pre>

			<div className="flex items-center justify-between">
				<Button
					onClick={() => setCurrentStep(step => step - 1)}
					disabled={currentStep === 0}
				>
					Previous
				</Button>

				<span className="text-sm text-slate-300">
					Step {currentStep + 1} of {lessons.length}
				</span>

				<Button
					onClick={() => setCurrentStep(step => step + 1)}
					disabled={currentStep === lessons.length - 1}
				>
					Next
				</Button>
			</div>
		</section>
	)
}