import {useEffect, useId, useRef} from 'react'
import './LearningPanels.css'

// Shared popup frame; children supply the tutorial or challenge content.
export default function LearningWindow({isOpen, onClose, title, children}) {
	const dialogRef = useRef(null) // Direct access to the native browser dialog.
	const dragRef = useRef(null) // Stores the pointer and window positions when dragging starts.
	const titleId = useId() // Connects the dialog's accessible name to its heading.

	// Sync the browser dialog with the open state supplied by its parent.
	useEffect(() => {
		const dialog = dialogRef.current

		if (isOpen && !dialog.open) {
			// Restore CSS centering whenever the window is reopened.
			for (const property of ['inset', 'margin', 'left', 'top']) {
				dialog.style.removeProperty(property)
			}

			dialog.showModal() // Opens above the page with native modal focus handling.
		} else if (!isOpen && dialog.open) {
			dialog.close()
		}
	}, [isOpen])

	function startDrag(event) { // Capture starting coordinates when the title bar is pressed.
		// Leave buttons and non-primary mouse clicks alone.
		if (event.button !== 0 || event.target.closest('button')) {
			return
		}

		const bounds = dialogRef.current.getBoundingClientRect() // Current viewport coordinates.

		dragRef.current = {
			pointerX: event.clientX,
			pointerY: event.clientY,
			left: bounds.left,
			top: bounds.top,
		}

		// Continue receiving movement when the pointer leaves the title bar.
		event.currentTarget.setPointerCapture(event.pointerId)
	}

	function moveDrag(event) { // Move by the distance traveled since the initial press.
		const start = dragRef.current // A null value means no drag is active.

		if (!start) {
			return
		}

		const dialog = dialogRef.current
		const bounds = dialog.getBoundingClientRect()

		// Keep the window within the browser viewport.
		const left = Math.max(0, Math.min(
			start.left + event.clientX - start.pointerX,
			window.innerWidth - bounds.width
		))
		const top = Math.max(0, Math.min(
			start.top + event.clientY - start.pointerY,
			window.innerHeight - bounds.height
		))

		// PANEL POSITION: dragging replaces CSS centering with pixel coordinates.
		dialog.style.inset = 'auto'
		dialog.style.margin = '0'
		dialog.style.left = `${left}px`
		dialog.style.top = `${top}px`
	}

	function stopDrag() { // End dragging on release, cancellation, or lost pointer capture.
		dragRef.current = null
	}

	return (
		<dialog
			ref={dialogRef}
			className="learning-dialog"
			aria-labelledby={titleId}
			onClose={onClose} // Notify the parent after Close, Escape, or a controlled close.
		>
			{/* Drag this title bar to reposition the window. */}
			<header
				className="learning-window-header"
				onPointerDown={startDrag}
				onPointerMove={moveDrag}
				onPointerUp={stopDrag}
				onPointerCancel={stopDrag}
				onLostPointerCapture={stopDrag}
			>
				<h2 id={titleId}>{title}</h2>

				<button type="button" onClick={() => dialogRef.current.close()}>
					Close
				</button>
			</header>

			{/* Render the tutorial or challenge supplied by the parent. */}
			{children}
		</dialog>
	)
}