import {useState} from 'react'
import NPCRoleDialogue from './NPCRoleDialogue'
import LearningExperience from '../learning/LearningExperience'

// Coordinates NPC dialogue and learning without adding state to the dashboard.
export default function KingdomInteractions() {
	const [isLearningOpen, setIsLearningOpen] = useState(false)

	return (
		<>
			<NPCRoleDialogue
				onOpenTutorial={() => setIsLearningOpen(true)}
			/>

			<LearningExperience
				isOpen={isLearningOpen}
				onClose={() => setIsLearningOpen(false)}
			/>
		</>
	)
}