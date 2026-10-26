import {useEffect, useState} from 'react'
import QuestionForm from '../features/admin/QuestionForm'
import {
	createCodingQuestion,
	deleteCodingQuestion,
	getCodingQuestions,
	updateCodingQuestion,
} from '../services/api'

// Must match DIFFICULTY_REWARDS in backend/services/core/models.py.
const DIFFICULTY_REWARDS = {easy: 25, medium: 50, hard: 100}

// Administrator page for listing, creating, editing, and deleting coding questions.
export default function AdminQuestions() {
	const [questions, setQuestions] = useState([])
	const [status, setStatus] = useState('loading') // loading, ready, or error
	const [message, setMessage] = useState('')
	const [editing, setEditing] = useState(null) // null = no form, 'new' = create form, or a question to edit.

	function loadQuestions() { // Fetches the latest questions from the database.
		return getCodingQuestions()
			.then(loaded => {
				setQuestions(loaded)
				setStatus('ready')
			})
			.catch(error => {
				setMessage(`Could not load questions: ${error.message}`)
				setStatus('error')
			})
	}

	useEffect(() => {
		loadQuestions()
	}, [])

	async function handleSave(question) { // Errors are shown inside the form.
		if (editing === 'new') {
			await createCodingQuestion(question)
			setMessage(`Created "${question.title}".`)
		} else {
			await updateCodingQuestion(editing.id, question)
			setMessage(`Saved changes to "${question.title}".`)
		}
		setEditing(null)
		await loadQuestions()
	}

	async function handleDelete(question) {
		if (!window.confirm(`Delete "${question.title}"? This cannot be undone.`)) {
			return
		}
		try {
			await deleteCodingQuestion(question.id)
			setMessage(`Deleted "${question.title}".`)
			await loadQuestions()
		} catch (error) {
			setMessage(`Could not delete: ${error.message}`)
		}
	}

	return (
		<main className="min-h-dvh bg-slate-900 px-4 py-8 text-slate-100">
			<div className="mx-auto max-w-5xl space-y-6">
				<header className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-2xl font-bold">Coding Questions</h1>
						<p className="text-sm text-slate-400">Administrator question management</p>
					</div>
					<div className="flex gap-3">
						<a href="/" className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600">Back to kingdom</a>
						{editing === null && (
							<button onClick={() => setEditing('new')} className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700">
								+ New question
							</button>
						)}
					</div>
				</header>

				{message && <p className="rounded bg-slate-800 px-4 py-2 text-sm">{message}</p>}

				{editing !== null && (
					<QuestionForm
						key={editing === 'new' ? 'new' : editing.id}
						question={editing === 'new' ? null : editing}
						rewards={DIFFICULTY_REWARDS}
						onSave={handleSave}
						onCancel={() => setEditing(null)}
					/>
				)}

				{status === 'loading' && <p className="text-slate-400">Loading questions...</p>}

				{status === 'ready' && questions.length === 0 && (
					<p className="rounded border border-dashed border-slate-600 p-6 text-center text-slate-400">
						No coding questions yet. Click "New question" to add the first one.
					</p>
				)}

				{status === 'ready' && questions.length > 0 && (
					<div className="overflow-x-auto rounded-lg border border-slate-700">
						<table className="w-full text-left text-sm">
							<thead className="bg-slate-800 text-slate-300">
								<tr>
									<th className="px-4 py-3">#</th>
									<th className="px-4 py-3">Title</th>
									<th className="px-4 py-3">Slug</th>
									<th className="px-4 py-3">Difficulty</th>
									<th className="px-4 py-3">Reward</th>
									<th className="px-4 py-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{questions.map(question => (
									<tr key={question.id} className="border-t border-slate-700">
										<td className="px-4 py-3 text-slate-400">{question.id}</td>
										<td className="px-4 py-3">
											<div className="font-medium">{question.title}</div>
											<div className="text-slate-400">{question.description}</div>
										</td>
										<td className="px-4 py-3 font-mono text-slate-300">{question.slug}</td>
										<td className="px-4 py-3 capitalize">{question.difficulty}</td>
										<td className="px-4 py-3">{question.reward} gold</td>
										<td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
											<button onClick={() => setEditing(question)} className="rounded bg-slate-600 px-3 py-1 hover:bg-slate-500">Edit</button>
											<button onClick={() => handleDelete(question)} className="rounded bg-red-700 px-3 py-1 hover:bg-red-800">Delete</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</main>
	)
}
