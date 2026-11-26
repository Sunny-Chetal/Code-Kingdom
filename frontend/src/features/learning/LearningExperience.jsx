import {useEffect, useState} from 'react'
import Tutorial, {TutorialReplayList} from './Tutorial' // Imports the logic for tutorials
import tutorials from './data/tutorial' // Tutorials in progression order.import Button from './components/Button'
import CodingMinigame from './CodingMinigame'
import LearningWindow from './LearningWindow'
import {
	getMinigameProgress, getTutorialProgress, markMinigameCompleted,
	markTutorialCompleted, submitChallengeAnswer
} from '../../services/api'

export default function LearningExperience({isOpen, onClose}) {
	// Tracks whether the minigame panel is visible.
	const [isMinigameOpen, setIsMinigameOpen] = useState(false)
	// State variable to track completed tutorials
	const [completedTutorialIds, setCompletedTutorialIds] = useState([])
	const [progressError, setProgressError] = useState('')
	// Tracks challenges passed during this page session.
	const [passedChallengeIds, setPassedChallengeIds] = useState([])
	// Keeps each challenge's editor text when switching between panels.
	const [challengeDrafts, setChallengeDrafts] = useState({})
	// Tracks a previously completed lesson being reviewed.
	const [replayTutorialId, setReplayTutorialId] = useState(null)
	useEffect(() => {
		let isMounted = true
		getTutorialProgress()
			.then(progress => {
				if (isMounted) {
					setCompletedTutorialIds(previousIds =>
						[...new Set([...previousIds, ...progress.completed_tutorial_ids])]
					)
				}
			})
			.catch(error => {
				if (isMounted) {
					setProgressError('Tutorial progress could not be loaded: ' + error.message)
				}
			})
		getMinigameProgress()
			.then(progress => {
				if (isMounted) {
					setPassedChallengeIds(previousIds =>
						[...new Set([...previousIds, ...progress.completed_minigame_ids])]
					)
				}
			})
			.catch(error => {
				if (isMounted) {
					setProgressError('Minigame progress could not be loaded: ' + error.message)
				}
			})
		return () => {
			isMounted = false
		}
	}, [])
	const currentTutorial = tutorials.find(tutorial => !passedChallengeIds.includes(tutorial.challenge.id))
	const replayTutorial = tutorials.find(tutorial => tutorial.id === replayTutorialId)
	const isReplayingTutorial = replayTutorial !== undefined
	// A missing current tutorial means every available challenge has been passed.
	const allTutorialsCompleted = currentTutorial === undefined
	// Keep saved lessons replayable, including the current lesson after a reload.
	const completedTutorials = tutorials.filter(tutorial => completedTutorialIds.includes(tutorial.id))

	// Function for recording the completion
	async function completeTutorial(tutorialId) {
		// Save the completion before showing it as complete in the tutorial list.
		setProgressError('')
		try {
			const progress = await markTutorialCompleted(tutorialId)
			setCompletedTutorialIds(previousIds =>
				[...new Set([...previousIds, ...progress.completed_tutorial_ids])]
			)
		} catch (error) {
			setProgressError('Tutorial progress could not be saved: ' + error.message)
		}
	}

	function updateChallengeCode(nextCode) {
		// Store drafts by challenge ID so different challenges keep separate code.
		setChallengeDrafts(previousDrafts => ({
			...previousDrafts,
			[currentTutorial.challenge.id]: nextCode,
		}))
	}

	function startChallenge() {
		// Initialize a draft on the first visit; preserve it on later visits.
		updateChallengeCode(
			challengeDrafts[currentTutorial.challenge.id]
			?? currentTutorial.challenge.starterCode
		)

		setIsMinigameOpen(true)
	}

	function completeChallenge(challengeId) {
		// Record each passed challenge only once.
		setPassedChallengeIds(previousIds => {
			if (previousIds.includes(challengeId)) {
				return previousIds
			}
			return [...previousIds, challengeId]
		})

		// Send the current challenge ID to the db helper
		markMinigameCompleted(challengeId)
		// Close the minigame
		setIsMinigameOpen(false)
	}

	async function submitAnswer(code) { // Sends the answer with the current challenge's ID.
		return submitChallengeAnswer(currentTutorial.challenge.id, code)
	}

	return (
		<LearningWindow
			isOpen={isOpen}
			onClose={onClose}
			title={replayTutorial?.title ?? currentTutorial?.title ?? 'Learning completed'}
		>
			{progressError && <p className="mb-3 text-red-300" role="alert">{progressError}</p>}
			{/* Keep the active lesson mounted while a completed one is being replayed. */}
			{currentTutorial && (
				<div hidden={isMinigameOpen || isReplayingTutorial}>
					<Tutorial
						key={currentTutorial.id}
						tutorial={currentTutorial}
						completedTutorialIds={completedTutorialIds}
						onComplete={completeTutorial}
						onStartChallenge={startChallenge}
						hasChallengeDraft={challengeDrafts[currentTutorial.challenge.id] !== undefined}
						completedTutorials={completedTutorials}
						onReplayTutorial={setReplayTutorialId}
					/>
				</div>
			)}

			{replayTutorial && (
				<Tutorial
					key={replayTutorial.id}
					tutorial={replayTutorial}
					completedTutorialIds={completedTutorialIds}
					isReplay
					onReturnToCurrent={() => setReplayTutorialId(null)}
				/>
			)}

			{allTutorialsCompleted && !replayTutorial && (
				<section className="learning-panel">
					<p role="status">
						You have completed all available tutorials and challenges!
					</p>
					<TutorialReplayList tutorials={completedTutorials} onReplay={setReplayTutorialId} />
				</section>
			)}

			{currentTutorial && isMinigameOpen && (
				<CodingMinigame
					challenge={currentTutorial.challenge}
					code={challengeDrafts[currentTutorial.challenge.id] ?? currentTutorial.challenge.starterCode}
					onCodeChange={updateChallengeCode}
					onSubmit={submitAnswer}
					onPassed={completeChallenge}
					onClose={() => setIsMinigameOpen(false)}
				/>
			)}
		</LearningWindow>
	)
}
