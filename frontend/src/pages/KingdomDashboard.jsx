import PhaserGame from '../game/PhaserGame'
import BackendStatus from '../components/BackendStatus'
import LearningExperience from '../components/LearningExperience'

export default function KingdomDashboard() {
    return (
        <main className="min-h-screen bg-slate-950 p-8 text-white">
            <h1 className="mb-6 text-center text-3xl font-bold">
                Code Kingdom
            </h1>
            <BackendStatus />
            <div className="mx-auto w-full max-w-3xl" style={{height: '450px'}}>
                <PhaserGame />
            </div>
            <LearningExperience />
        </main>
    )
}
