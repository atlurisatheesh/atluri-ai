import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
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

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/copilot" element={<CopilotPage />} />
                    <Route path="/coding" element={<CodingPage />} />
                    <Route path="/mock" element={<MockPage />} />
                    <Route path="/duo" element={<DuoPage />} />
                    <Route path="/resume" element={<ResumePage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/questions" element={<QuestionBankPage />} />
                    <Route path="/billing" element={<BillingPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/stealth" element={<StealthPage />} />
                    <Route path="/documents" element={<DocumentsPage />} />
                </Routes>
            </Router>
        </AuthProvider>
    )
}

export default App
