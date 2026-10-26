import {useState} from 'react'

const EMPTY_QUESTION = {
	slug: '',
	title: '',
	description: '',
	starter_code: '',
	checks: '{}',
	difficulty: 'easy',
}

// Form for creating a question, or editing one when `question` is supplied.
export default function QuestionForm({question, rewards, onSave, onCancel}) {
	const [values, setValues] = useState(() => question
		? {...question, checks: JSON.stringify(question.checks, null, 2)}
		: EMPTY_QUESTION)
	const [error, setError] = useState('')
	const [isSaving, setIsSaving] = useState(false)

	function update(field) { // Returns a change handler for one form field.
		return event => setValues(previous => ({...previous, [field]: event.target.value}))
	}

	async function handleSubmit(event) {
		event.preventDefault()
		setError('')

		let checks
		try {
			checks = JSON.parse(values.checks || '{}') // Grading rules are typed as JSON.
		} catch {
			setError('Checks must be valid JSON, for example {"output": "100"}')
			return
		}

		setIsSaving(true)
		try {
			await onSave({
				slug: values.slug.trim(),
				title: values.title.trim(),
				description: values.description.trim(),
				starter_code: values.starter_code,
				checks,
				difficulty: values.difficulty,
			})
		} catch (saveError) {
			setError(saveError.message)
		} finally {
			setIsSaving(false)
		}
	}

	const inputClass = 'w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100'

	return (
		<form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-700 bg-slate-800 p-5">
			<h2 className="text-lg font-bold">{question ? `Edit question #${question.id}` : 'New coding question'}</h2>

			<div className="grid gap-4 sm:grid-cols-2">
				<label className="block space-y-1">
					<span className="text-sm text-slate-300">Slug (lowercase-with-hyphens)</span>
					<input className={inputClass} value={values.slug} onChange={update('slug')} placeholder="variables-challenge" required/>
				</label>
				<label className="block space-y-1">
					<span className="text-sm text-slate-300">Title</span>
					<input className={inputClass} value={values.title} onChange={update('title')} placeholder="Variables Challenge" required/>
				</label>
			</div>

			<label className="block space-y-1">
				<span className="text-sm text-slate-300">Description shown to students</span>
				<textarea className={inputClass} rows={3} value={values.description} onChange={update('description')} required/>
			</label>

			<label className="block space-y-1">
				<span className="text-sm text-slate-300">Difficulty</span>
				<select className={inputClass} value={values.difficulty} onChange={update('difficulty')}>
					{Object.entries(rewards).map(([level, gold]) => (
						<option key={level} value={level}>{level} ({gold} gold)</option>
					))}
				</select>
			</label>

			<label className="block space-y-1">
				<span className="text-sm text-slate-300">Starter code</span>
				<textarea className={`${inputClass} font-mono`} rows={4} value={values.starter_code} onChange={update('starter_code')}/>
			</label>

			<label className="block space-y-1">
				<span className="text-sm text-slate-300">Checks (JSON grading rules)</span>
				<textarea className={`${inputClass} font-mono`} rows={4} value={values.checks} onChange={update('checks')}/>
			</label>

			{error && <p className="rounded bg-red-900/60 px-3 py-2 text-sm text-red-100">{error}</p>}

			<div className="flex gap-3">
				<button type="submit" disabled={isSaving} className="rounded bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-700 disabled:opacity-50">
					{isSaving ? 'Saving...' : 'Save question'}
				</button>
				<button type="button" onClick={onCancel} className="rounded bg-slate-600 px-4 py-2 hover:bg-slate-700">
					Cancel
				</button>
			</div>
		</form>
	)
}
