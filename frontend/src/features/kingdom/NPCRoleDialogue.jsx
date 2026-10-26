import {useEffect, useRef, useState} from 'react'
import {onKingdomDialogue, sendKingdomCommand} from './kingdomBridge'
import Button from '../../components/ui/Button'
import '../learning/LearningPanels.css'

const roles = {
	librarian: {title: 'Librarian', message: "I’m the librarian. I look after the kingdom’s library and help you find knowledge.", canOpenTutorial: true,},
	knight: {title: 'Knight', message: "I’m the knight. I guard the castle and protect the kingdom."},
	vendor: {title: 'Vendor', message: "I’m the vendor. I run the market and help keep the kingdom supplied."},
	farmer: {title: 'Farmer', message: "I’m the farmer. I tend the farm and grow food for the kingdom."},
	wizard: {title: 'Wizard', message: "I’m the wizard. I study magic in the tower and share what I learn."},
	artisan: {title: 'Artisan', message: "I’m the artisan. I work in the workshop, crafting and repairing things for the kingdom."}
}

export default function NPCRoleDialogue({onOpenTutorial}) {
	const [dialogue, setDialogue] = useState(null)
	const modal = useRef(null)
	const openTutorialOnCloseRef = useRef(false) // Remembers whether closing should open learning.

	useEffect(() => {
		const unsubscribe = onKingdomDialogue(({npcId}) => {
			const role = roles[npcId]
			if (!role) return
			sendKingdomCommand({type: 'set-controls', enabled: false})
			setDialogue(role)
		})
		return () => {
			unsubscribe()
			sendKingdomCommand({type: 'set-controls', enabled: true})
		}
	}, [])

	useEffect(() => {
		if (dialogue && !modal.current.open) {
			modal.current.showModal()
			modal.current.focus()
		}
	}, [dialogue])

	function requestTutorial() {
		openTutorialOnCloseRef.current = true
		modal.current.close()
	}

	function closeDialogue() {
		setDialogue(null)
		sendKingdomCommand({type: 'set-controls', enabled: true})

		// Finish closing NPC dialogue before opening the learning window.
		if (openTutorialOnCloseRef.current) {
			openTutorialOnCloseRef.current = false
			onOpenTutorial?.()
		}
	}

	return (
		<dialog
			ref={modal}
			className="learning-panel npc-dialogue"
			aria-labelledby="npc-role-title"
			aria-describedby="npc-role-message"
			onClose={closeDialogue}
		>
			<h2 id="npc-role-title" className="mb-3 text-xl font-bold">
				{dialogue?.title}
			</h2>

			<p id="npc-role-message" className="mb-5">
				{dialogue?.message}
			</p>

			<div className="npc-dialogue-actions">
				{dialogue?.canOpenTutorial && onOpenTutorial && (
					<Button onClick={requestTutorial}>
						Open tutorial
					</Button>
				)}

				<Button onClick={() => modal.current.close()}>
					Close
				</Button>

				<span className="text-sm">or press Esc</span>
			</div>
		</dialog>
	)
}