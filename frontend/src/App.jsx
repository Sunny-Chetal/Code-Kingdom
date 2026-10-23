import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import Tutorial from './components/Tutorial'
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

  return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <h1 className="mb-6 text-center text-3xl font-bold">
          Code Kingdom
        </h1>
        <p className="mb-4 text-center">
          {backendStatus}
        </p>
        <div ref={container} className="mx-auto w-full max-w-3xl"/>
        <Tutorial 		// Displays tutorial steps using completedTutorialIds and reports completion through completeTutorial
			completedTutorialIds={completedTutorialIds}
			onComplete={completeTutorial}
		/>

        {isMinigameOpen ? ( // Uses isMinigameOpen to show the panel or its opening button; onClose hides the panel.
			<CodingMinigame onClose={() => setIsMinigameOpen(false)} />
		) : (
			<div className="mt-6 text-center">
				<Button onClick={() => setIsMinigameOpen(true)}>
					Open Coding Minigame
				</Button>
			</div>
		)}
      </main>
  )
}
