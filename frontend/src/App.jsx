import {useEffect, useRef, useState} from 'react'
import Phaser from 'phaser'
import Tutorial from './components/Tutorial' // Imports the logic for tutorials
import tutorials from './data/tutorial' // Tutorials in progression order.import Button from './components/Button'
import CodingMinigame from './components/CodingMinigame'
import Button from "./components/Button.jsx";
import LearningWindow from './components/LearningWindow'

// Everything with comments was added by Jordan and will be moved to separate files soon

export default function App() {
	const container = useRef(null)
	const [backendStatus, setBackendStatus] = useState('Checking...')
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

	useEffect(() => {
		const controller = new AbortController()

		async function checkBackend() {
			try {
				const response = await fetch(
					'http://127.0.0.1:8000/api/health',
					{signal: controller.signal}
				)

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`)
				}

				const data = await response.json()

				setBackendStatus(
					`Backend: ${data.status} | Database: ${data.database}`
				)
			} catch (error) {
				if (error.name !== 'AbortError') {
					setBackendStatus('Backend connection failed')
					console.error(error)
				}
			}
		}

		checkBackend()

		return () => controller.abort()
	}, [])

	useEffect(() => {
		const game = new Phaser.Game({
			type: Phaser.AUTO,
			parent: container.current,
			width: 800,
			height: 450,
			backgroundColor: '#1e293b',
			scale: {
				mode: Phaser.Scale.FIT,
				autoCenter: Phaser.Scale.CENTER_BOTH
			},
			scene: {
				create() {
					this.add.text(400, 225, 'Code Kingdom', {
						fontSize: '48px',
						color: '#ffffff'
					}).setOrigin(0.5)
				}
			}
		})

		return () => game.destroy(true)
	}, [])

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
		const response = await fetch(
			'http://127.0.0.1:8000/api/challenge-submissions',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					challenge_id: tutorialData.challenge.id,
					code,
				}),
			}
		)

		if (!response.ok) {
			throw new Error('Answer submission failed')
		}

		return response.json()
	}

	return (
		<main className="min-h-screen bg-slate-950 p-8 text-white">
			<h1 className="mb-6 text-center text-3xl font-bold">
				Code Kingdom
			</h1>

			<p className="mb-4 text-center">
				{backendStatus}
			</p>

			<div ref={container} className="mx-auto w-full max-w-3xl"/>

			{allTutorialsCompleted ? (
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
			)}
		</main>
	)
}