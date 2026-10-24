import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import Tutorial from './components/Tutorial' // Imports the logic for tutorials
import tutorialData from './data/tutorial' // Imports the data from data/tutorial
import Button from './components/Button'
import CodingMinigame from './components/CodingMinigame'

// Everything with comments was added by Jordan and will be moved to separate files soon

export default function App() {
  const container = useRef(null)
  const [backendStatus, setBackendStatus] = useState('Checking...')
  // Tracks whether the minigame panel is visible.
  const [isMinigameOpen, setIsMinigameOpen] = useState(false)
  // State variable to track completed tutorials
  const [completedTutorialIds, setCompletedTutorialIds] = useState([])
  // Checks completion of the tutorial currently supplied by tutorialData.
  const isMinigameUnlocked = completedTutorialIds.includes(tutorialData.id)

  useEffect(() => {
    const controller = new AbortController()

    async function checkBackend() {
      try {
        const response = await fetch(
          'http://127.0.0.1:8000/api/health',
          { signal: controller.signal }
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

			<div ref={container} className="mx-auto w-full max-w-3xl" />

			<Tutorial
				tutorial={tutorialData}
				completedTutorialIds={completedTutorialIds}
				onComplete={completeTutorial}
			/>

			{isMinigameOpen ? (
                <CodingMinigame
					challenge={tutorialData.challenge}
					onSubmit={submitAnswer}
					onClose={() => setIsMinigameOpen(false)}
				/>
			) : (
				<div className="mt-6 text-center">
					<Button
						onClick={() => setIsMinigameOpen(true)}
						disabled={!isMinigameUnlocked}
					>
						Open Coding Minigame
					</Button>

					{!isMinigameUnlocked && (
						<p className="mt-2 text-sm text-slate-300">
							Complete {tutorialData.title} to unlock this minigame.
						</p>
					)}
				</div>
			)}
		</main>
	)
}