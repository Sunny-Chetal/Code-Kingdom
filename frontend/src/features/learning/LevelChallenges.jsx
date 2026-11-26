import Button from '../../components/ui/Button'

// Lists the coding challenges for the student's current level; the parent supplies the start callback.
export default function LevelChallenges({progression, passedChallengeIds, onStart}) {
	if (!progression || progression.all_completed) {
		return null
	}

	return (
		<section className="mb-6" aria-label="Level challenges">
			<h3 className="mb-2 text-lg font-semibold">Level {progression.level} challenges</h3>
			<p className="mb-3">Finish every challenge in this level to unlock the next one.</p>
			<ul className="space-y-2">
				{progression.questions.map(question => (
					<li key={question.id} className="flex items-center justify-between gap-3">
						<span>{question.title} ({question.difficulty}, {question.reward} gold)</span>
						{passedChallengeIds.includes(question.slug)
							? <span>Completed</span>
							: <Button onClick={() => onStart(question)}>Start</Button>}
					</li>
				))}
			</ul>
		</section>
	)
}
