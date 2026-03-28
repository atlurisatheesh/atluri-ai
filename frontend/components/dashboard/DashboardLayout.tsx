"use client";

import { ReactNode } from "react";
import Sidebar, { SidebarProvider, useSidebar } from "./Sidebar";
import TopBar from "./TopBar";
import AuthGate from "../AuthGate";

function DashboardInner({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar />
      <div className={`flex-1 transition-all ${collapsed ? "ml-16" : "ml-[260px]"}`}>
        <TopBar />
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <SidebarProvider>
        <DashboardInner>{children}</DashboardInner>
      </SidebarProvider>
    </AuthGate>
  );
}
