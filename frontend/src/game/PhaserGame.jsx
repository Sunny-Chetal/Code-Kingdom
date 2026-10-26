
import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { gameConfig } from './gameConfig'
import NPCRoleDialogue from './NPCRoleDialogue'

export default function PhaserGame() {
  const container = useRef(null)

  useEffect(() => {
    const game = new Phaser.Game({
      ...gameConfig,
      parent: container.current
    })

    return () => game.destroy(true)
  }, [])

  return (
    <>
      <div ref={container} style={{ width: '100%', height: '100%' }} />
      <NPCRoleDialogue />
    </>
  )
}
