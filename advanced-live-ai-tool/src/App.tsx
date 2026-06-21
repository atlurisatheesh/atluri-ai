import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, AuthProvider } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CopilotPage from './pages/CopilotPage'
import CodingPage from './pages/CodingPage'
import MockPage from './pages/MockPage'
import DuoPage from './pages/DuoPage'
import ResumePage from './pages/ResumePage'
import AnalyticsPage from './pages/AnalyticsPage'
import QuestionBankPage from './pages/QuestionBankPage'
import BillingPage from './pages/BillingPage'
import SettingsPage from './pages/SettingsPage'
import StealthPage from './pages/StealthPage'
import DocumentsPage from './pages/DocumentsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth()
    if (isLoading) return null
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
                    <Route path="/copilot" element={<RequireAuth><CopilotPage /></RequireAuth>} />
                    <Route path="/coding" element={<RequireAuth><CodingPage /></RequireAuth>} />
                    <Route path="/mock" element={<RequireAuth><MockPage /></RequireAuth>} />
                    <Route path="/duo" element={<RequireAuth><DuoPage /></RequireAuth>} />
                    <Route path="/resume" element={<RequireAuth><ResumePage /></RequireAuth>} />
                    <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
                    <Route path="/questions" element={<RequireAuth><QuestionBankPage /></RequireAuth>} />
                    <Route path="/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
                    <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                    <Route path="/stealth" element={<RequireAuth><StealthPage /></RequireAuth>} />
                    <Route path="/documents" element={<RequireAuth><DocumentsPage /></RequireAuth>} />
                </Routes>
            </Router>
        </AuthProvider>
    )
}

export default App
