"use client";

import { useState, useEffect } from "react";
import { Bell, Search, User, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useSidebar } from "./Sidebar";

export default function TopBar() {
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();
  const [displayName, setDisplayName] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await supabase.auth.getSession();
        const user = result.data.session?.user;
        if (!user) return;
        const name =
          user.display_name ||
          user.email?.split("@")[0] ||
          "User";
        setDisplayName(String(name));
      } catch {}
    };
    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      try {
        localStorage.removeItem("atluriin.e2e.bypass");
        localStorage.removeItem("atluriin.e2e.user_id");
        localStorage.removeItem("atluriin.auth.token");
        localStorage.removeItem("atluriin.auth.user");
      } catch {}
      await supabase.auth.signOut();
      router.push("/login?next=/app");
    } catch {} finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="h-16 border-b border-white/[0.06] bg-canvas/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 transition-all w-full sticky top-0 z-30">
      <div className="flex items-center gap-3 md:hidden mr-2">
        <button 
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-white/[0.04] transition text-textMuted hover:text-textPrimary cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Search className="w-4 h-4 text-textMuted" />
        <input
          type="text"
          placeholder="Search sessions, questions..."
          className="bg-transparent text-sm text-textPrimary placeholder:text-textMuted outline-none flex-1"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button title="Notifications" className="relative p-2 rounded-lg hover:bg-white/[0.04] transition text-textMuted hover:text-textPrimary cursor-pointer">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-cyan" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center text-white text-sm font-bold">
              {displayName.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-sm text-textPrimary hidden sm:block">{displayName || "User"}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-48 bg-canvas/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-lg py-2 z-50">
              <button
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-textSecondary hover:bg-white/[0.04] hover:text-textPrimary transition cursor-pointer"
                onClick={() => { setShowUserMenu(false); router.push("/settings"); }}
              >
                <User className="w-4 h-4" /> Profile & Settings
              </button>
              <button
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-brand-red hover:bg-brand-red/10 transition cursor-pointer"
                onClick={() => { setShowUserMenu(false); handleSignOut(); }}
                disabled={signingOut}
              >
                <LogOut className="w-4 h-4" /> {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
