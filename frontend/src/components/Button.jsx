// Shared styling; props supply the label, click handler, disabled state, and button type.
// The default type prevents accidental form submission.
export default function Button({children, onClick, disabled = false, type = 'button'}) {
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{children}
		</button>
	)
}