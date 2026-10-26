import PhaserGame from '../features/kingdom/PhaserGame'
import DebugOverlay from '../features/debug/DebugOverlay'
import KingdomInteractions from '../features/kingdom/KingdomInteractions'

export default function KingdomDashboard() {
	return (
		// DASHBOARD SIZE: fill the browser viewport without page scrolling.
		<main className="h-dvh w-full overflow-hidden">
			<PhaserGame />
			<KingdomInteractions />
			<DebugOverlay />
		</main>
	)
}