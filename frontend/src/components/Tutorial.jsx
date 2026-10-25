import {useState} from 'react'
import Button from './Button'
import './LearningPanels.css'

// Displays tutorial steps; the parent supplies completion IDs and the completion callback.
export default function Tutorial({
	tutorial,
	completedTutorialIds,
	onComplete,
	onStartChallenge,
	hasChallengeDraft,
}) {
	const [currentStep, setCurrentStep] = useState(0) // Index of the displayed step.
	const lesson = tutorial.steps[currentStep] // Content for the selected step.
	const isCompleted = completedTutorialIds.includes(tutorial.id) // Checks the parent’s completion list.
	const isLastStep = currentStep === tutorial.steps.length - 1 // Allows completion on the final step.

	// Navigation changes currentStep; the completion button calls onComplete with this tutorial’s ID.
	return (
		<section className="learning-panel">
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
					Step {currentStep + 1} of {tutorial.steps.length}
				</span>

				<Button
					onClick={() => setCurrentStep(step => step + 1)}
					disabled={currentStep === tutorial.steps.length - 1}
				>
					Next
				</Button>
			</div>

			{isCompleted ? (
				<div className="mt-4">
					<p className="mb-3">
						Tutorial completed
					</p>

					<Button onClick={onStartChallenge}>
						{hasChallengeDraft ? 'Resume challenge' : 'Start challenge'}
					</Button>
				</div>
			) : (
				isLastStep && (
					<div className="mt-4">
						<Button onClick={() => onComplete(tutorial.id)}>
							Complete Tutorial
						</Button>
					</div>
				)
			)}
		</section>
	)
}
