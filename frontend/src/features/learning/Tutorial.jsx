import {useState} from 'react'
import Button from '../../components/ui/Button'
import './LearningPanels.css'

export function TutorialReplayList({tutorials, onReplay}) {
	if (tutorials.length === 0) {
		return null
	}

	return (
		<nav className="mt-6 border-t-2 border-amber-700 pt-4" aria-label="Completed tutorials">
			<h3 className="mb-2 text-lg font-semibold">Replay a completed tutorial</h3>
			<p className="mb-3">Choose a lesson to review it again.</p>
			<ul className="flex flex-wrap gap-2">
				{tutorials.map(completedTutorial => (
					<li key={completedTutorial.id}>
						<Button onClick={() => onReplay(completedTutorial.id)}>
							{completedTutorial.title}
						</Button>
					</li>
				))}
			</ul>
		</nav>
	)
}

// Displays tutorial steps; the parent supplies completion IDs and the completion callback.
export default function Tutorial({
	tutorial,
	completedTutorialIds,
	onComplete,
	onStartChallenge,
	hasChallengeDraft,
	completedTutorials = [],
	onReplayTutorial,
	isReplay = false,
	onReturnToCurrent,
}) {
	const [currentStep, setCurrentStep] = useState(0) // Index of the displayed step.
	const lesson = tutorial.steps[currentStep] // Content for the selected step.
	const isCompleted = completedTutorialIds.includes(tutorial.id) // Checks the parent’s completion list.
	const isLastStep = currentStep === tutorial.steps.length - 1 // Allows completion on the final step.

	// Navigation changes currentStep; the completion button calls onComplete with this tutorial’s ID.
	return (
		<section className="learning-panel">
			<h2 className="mb-4 text-2xl font-bold">{isReplay ? 'Replay Tutorial' : 'Programming Tutorial'}</h2>
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

			{isReplay ? (
				<div className="mt-4">
					<p role="status" className="mb-3">Reviewing {tutorial.title}.</p>
					<Button onClick={onReturnToCurrent}>Return to current learning</Button>
				</div>
			) : isCompleted ? (
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

			{!isReplay && <TutorialReplayList tutorials={completedTutorials} onReplay={onReplayTutorial} />}
		</section>
	)
}
