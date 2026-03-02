import Sidebar from '../components/dashboard/Sidebar'
import TopBar from '../components/dashboard/TopBar'
import Overview from '../components/dashboard/Overview'

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-bg-primary flex">
            <Sidebar />
            <div className="flex-1 ml-[240px]">
                <TopBar />
                <Overview />
            </div>
        </div>
    )
}
