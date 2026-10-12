import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

export default function App() {
  const container = useRef(null)
  const [backendStatus, setBackendStatus] = useState('Checking...')

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

  return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <h1 className="mb-6 text-center text-3xl font-bold">
          Code Kingdom
        </h1>
        <p className="mb-4 text-center">
          {backendStatus}
        </p>
        <div ref={container} className="mx-auto w-full max-w-3xl"/>
      </main>
  )
}
