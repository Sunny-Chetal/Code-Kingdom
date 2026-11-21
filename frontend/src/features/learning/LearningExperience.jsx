import {useState} from 'react'
import Tutorial, {TutorialReplayList} from './Tutorial' // Imports the logic for tutorials
import tutorials from './data/tutorial' // Tutorials in progression order.import Button from './components/Button'
import CodingMinigame from './CodingMinigame'
import LearningWindow from './LearningWindow'
import {submitChallengeAnswer} from '../../services/api'

export default function LearningExperience({isOpen, onClose}) {
	// Tracks whether the minigame panel is visible.
	const [isMinigameOpen, setIsMinigameOpen] = useState(false)
	// State variable to track completed tutorials
	const [completedTutorialIds, setCompletedTutorialIds] = useState([])
	// Tracks challenges passed during this page session.
	const [passedChallengeIds, setPassedChallengeIds] = useState([])
	// Keeps each challenge's editor text when switching between panels.
	const [challengeDrafts, setChallengeDrafts] = useState({})
	// Tracks a previously completed lesson being reviewed.
	const [replayTutorialId, setReplayTutorialId] = useState(null)
	const currentTutorial = tutorials.find(tutorial => !passedChallengeIds.includes(tutorial.challenge.id))
	const replayTutorial = tutorials.find(tutorial => tutorial.id === replayTutorialId)
	const isReplayingTutorial = replayTutorial !== undefined
	// A missing current tutorial means every available challenge has been passed.
	const allTutorialsCompleted = currentTutorial === undefined
	const completedTutorials = tutorials.filter(tutorial =>
		completedTutorialIds.includes(tutorial.id) && tutorial.id !== currentTutorial?.id
	)

	// Function for recording the completion
	function completeTutorial(tutorialId) {
		setCompletedTutorialIds(previousIds => {
			if (previousIds.includes(tutorialId)) {
				return previousIds
			}
			return [...previousIds, tutorialId]
		})
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
