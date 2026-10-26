import {useState} from 'react'
import Tutorial from './Tutorial' // Imports the logic for tutorials
import tutorials from '../data/tutorial' // Tutorials in progression order.import Button from './components/Button'
import CodingMinigame from './CodingMinigame'
import Button from "./Button.jsx";
import LearningWindow from './LearningWindow'
import {submitChallengeAnswer} from '../services/api'

export default function LearningExperience() {
	// Tracks whether the minigame panel is visible.
	const [isMinigameOpen, setIsMinigameOpen] = useState(false)
	// State variable to track completed tutorials
	const [completedTutorialIds, setCompletedTutorialIds] = useState([])
	// Tracks challenges passed during this page session.
	const [passedChallengeIds, setPassedChallengeIds] = useState([])
	const tutorialData = tutorials.find(tutorial => !passedChallengeIds.includes(tutorial.challenge.id))
	// A missing tutorial means every available challenge has been passed.
	const allTutorialsCompleted = tutorialData === undefined
	// Controls whether the tutorial/challenge popup is open.
	const [isLearningOpen, setIsLearningOpen] = useState(false)
	// Keeps each challenge's editor text when switching between panels.
	const [challengeDrafts, setChallengeDrafts] = useState({})

	// Entry point for the button or an NPC interaction.
	function openLearningPanel() {
		setIsLearningOpen(true)
	}

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
			[tutorialData.challenge.id]: nextCode,
		}))
	}

	function startChallenge() {
		// Initialize a draft on the first visit; preserve it on later visits.
		updateChallengeCode(
			challengeDrafts[tutorialData.challenge.id]
			?? tutorialData.challenge.starterCode
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
		return submitChallengeAnswer(tutorialData.challenge.id, code)
	}

	return (
		allTutorialsCompleted ? (
			<p role="status" className="mt-8 text-center text-green-400">
				You have completed all available tutorials and challenges!
			</p>
		) : (
			<>
				<Button onClick={openLearningPanel}>
					Open tutorial
				</Button>

				<LearningWindow
					isOpen={isLearningOpen}
					onClose={() => setIsLearningOpen(false)}
					title={tutorialData.title}
				>
					{/* Hide without unmounting so the tutorial keeps its current step. */}
					<div hidden={isMinigameOpen}>
						<Tutorial
							key={tutorialData.id}
							tutorial={tutorialData}
							completedTutorialIds={completedTutorialIds}
							onComplete={completeTutorial}
								onStartChallenge={startChallenge}
								hasChallengeDraft={
									challengeDrafts[tutorialData.challenge.id] !== undefined
								}
						/>
					</div>

						{isMinigameOpen && (
							<CodingMinigame
								challenge={tutorialData.challenge}
								code={
									challengeDrafts[tutorialData.challenge.id]
									?? tutorialData.challenge.starterCode
								}
								onCodeChange={updateChallengeCode}
								onSubmit={submitAnswer}
								onPassed={completeChallenge}
								onClose={() => setIsMinigameOpen(false)}
							/>
						)}
				</LearningWindow>
			</>
		)
	)
}
