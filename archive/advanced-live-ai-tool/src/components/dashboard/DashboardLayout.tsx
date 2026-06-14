import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface DashboardLayoutProps {
    children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-bg-primary flex">
            <Sidebar />
            <div className="flex-1 ml-[240px]">
                <TopBar />
                <main className="p-6 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
