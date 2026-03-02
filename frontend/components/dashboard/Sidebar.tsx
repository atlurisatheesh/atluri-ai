"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Zap, Code2, Theater, Users, EyeOff, FileText,
  BookOpen, BarChart3, Settings, CreditCard, HelpCircle,
  ChevronLeft, ChevronRight, LogOut, MessageSquare,
  Brain, Target, Shield, Database,
} from "lucide-react";

/* ── Sidebar collapsed context ────────────────────────── */
const SidebarContext = createContext({ collapsed: false, toggle: () => {} });
export const useSidebar = () => useContext(SidebarContext);

/* ── Nav items ────────────────────────────────────────── */
type NavItem = { icon: React.ReactNode; label: string; path: string; highlight?: boolean } | { divider: true };

const navItems: NavItem[] = [
  { icon: <Home className="w-5 h-5" />, label: "Overview", path: "/app" },
  { icon: <MessageSquare className="w-5 h-5" />, label: "AI Chat", path: "/app?mode=chat" },
  { icon: <Brain className="w-5 h-5" />, label: "Live Copilot", path: "/copilot", highlight: true },
  { icon: <Code2 className="w-5 h-5" />, label: "Coding Lab", path: "/coding" },
  { icon: <Target className="w-5 h-5" />, label: "Mock Interview", path: "/mock" },
  { icon: <Users className="w-5 h-5" />, label: "Duo Mode", path: "/duo" },
  { icon: <FileText className="w-5 h-5" />, label: "Resume Lab", path: "/resume" },
  { icon: <Shield className="w-5 h-5" />, label: "Stealth Mode", path: "/stealth" },
  { icon: <Database className="w-5 h-5" />, label: "Documents", path: "/documents" },
  { icon: <BookOpen className="w-5 h-5" />, label: "Question Bank", path: "/questions" },
  { icon: <BarChart3 className="w-5 h-5" />, label: "Analytics", path: "/analytics" },
  { divider: true },
  { icon: <Settings className="w-5 h-5" />, label: "Settings", path: "/settings" },
  { icon: <CreditCard className="w-5 h-5" />, label: "Billing & Credits", path: "/billing" },
  { icon: <HelpCircle className="w-5 h-5" />, label: "Help", path: "#" },
];

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("atluriin.sidebar.collapsed");
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("atluriin.sidebar.collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path.includes("?")) {
      return pathname === path.split("?")[0];
    }
    return pathname === path;
  };

  return (
    <motion.aside
      className="fixed left-0 top-0 bottom-0 z-40 bg-canvas/80 backdrop-blur-xl border-r border-white/[0.06] flex flex-col"
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/[0.06]">
        <Link href="/app" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                className="text-sm font-semibold whitespace-nowrap text-textPrimary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Atluri<span className="gradient-text">In</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
        {navItems.map((item, i) => {
          if ("divider" in item) {
            return <div key={`div-${i}`} className="my-3 mx-2 h-px bg-white/[0.06]" />;
          }
          const active = isActive(item.path);
          return (
            <Link
              key={item.path + item.label}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group ${
                active
                  ? "bg-brand-cyan/10 text-brand-cyan"
                  : item.highlight
                  ? "text-brand-cyan hover:bg-brand-cyan/5"
                  : "text-textSecondary hover:bg-white/[0.04] hover:text-textPrimary"
              }`}
            >
              {active && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-brand-cyan"
                  layoutId="sidebar-active"
                  transition={{ duration: 0.3 }}
                />
              )}
              <span className="flex-shrink-0">{item.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span className="whitespace-nowrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.highlight && !collapsed && (
                <span className="ml-auto text-[10px] bg-brand-cyan/20 text-brand-cyan px-1.5 py-0.5 rounded-full">LIVE</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-textMuted hover:bg-white/[0.04] hover:text-textPrimary transition cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> <span>Collapse</span></>}
        </button>
      </div>
    </motion.aside>
  );
}
