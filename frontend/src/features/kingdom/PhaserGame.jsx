import {useEffect, useRef} from 'react'
import Phaser from 'phaser'
import {gameConfig} from './gameConfig'
import {toKingdomSceneState} from './savedKingdom'

export default function PhaserGame({savedKingdom}) {
	const container = useRef(null)
	//Keep the loaded state for this game session
	const initialKingdom = useRef(savedKingdom)

	useEffect(() => {
		const loadedKingdom = initialKingdom.current;
		const sceneState = toKingdomSceneState(loadedKingdom);

		const game = new Phaser.Game({
			...gameConfig,
			parent: container.current,
			callbacks: {
				//Set saved progress before the scene starts
				preBoot(game) {
					game.registry.set('kingdomState', sceneState);

					if (loadedKingdom) {
						game.registry.set('kingdomResources', loadedKingdom.resources);
					}
				}
			}
		})

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
	}, [])

	return (
		<div ref={container} style={{width: '100%', height: '100%'}}/>
	)
}
