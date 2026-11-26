import {useEffect, useRef} from 'react'
import Phaser from 'phaser'
import {gameConfig} from './gameConfig'
import {toKingdomSceneState} from './savedKingdom'

// savedKingdom is the progress loaded at login: {resources, buildings}.
export default function PhaserGame({savedKingdom}) {
	const container = useRef(null)

	useEffect(() => {
		const game = new Phaser.Game({
			...gameConfig,
			parent: container.current
		})
		// KingdomScene reads these from the registry when it starts, so saved buildings appear right away.
		if (savedKingdom) {
			game.registry.set('kingdomState', toKingdomSceneState(savedKingdom))
			game.registry.set('kingdomResources', savedKingdom.resources)
		}

		function syncKeyboardFocus() {
			if (!game.input?.keyboard) return
			const editing = document.querySelector('dialog[open]') || document.activeElement?.closest(
				'input, textarea, select, [contenteditable="true"]'
			)
			game.input.keyboard.enabled = !editing
			for (const scene of game.scene.getScenes(true)) {
				scene.input.keyboard?.resetKeys()
			}
		}

		document.addEventListener('focusin', syncKeyboardFocus)
		document.addEventListener('close', syncKeyboardFocus, true)
		game.events.once(Phaser.Core.Events.READY, syncKeyboardFocus)

		return () => {
			document.removeEventListener('focusin', syncKeyboardFocus)
			document.removeEventListener('close', syncKeyboardFocus, true)
			game.events.off(Phaser.Core.Events.READY, syncKeyboardFocus)
			game.destroy(true)
		}
	}, [savedKingdom])

	return (
		<div ref={container} style={{width: '100%', height: '100%'}}/>
	)
}
