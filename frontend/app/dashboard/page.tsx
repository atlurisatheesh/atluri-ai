"use client";

import AuthGate from "../../components/AuthGate";
import DashboardPanel from "../../components/DashboardPanel";

export default function DashboardPage() {
  return (
    <AuthGate>
      <div style={{ padding: 24, background: "#f3f2ef", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
        <DashboardPanel />
      </div>
    </AuthGate>
  );
}
