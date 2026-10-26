import KingdomDashboard from './pages/KingdomDashboard'
import AdminQuestions from './pages/AdminQuestions'

export default function App() {
    // The administrator question page lives at http://localhost:5173/admin
    if (window.location.pathname === '/admin') {
        return <AdminQuestions />
    }
    return <KingdomDashboard />
}
