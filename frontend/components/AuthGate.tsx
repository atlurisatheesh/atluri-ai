"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

function shouldBypassAuth(): boolean {
  // Only allow bypass when explicitly set in a test/CI environment.
  // The localStorage bypass has been removed — any user could set it in DevTools.
  return process.env.NEXT_PUBLIC_E2E_BYPASS_AUTH === "true" &&
    process.env.NODE_ENV !== "production";
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (shouldBypassAuth()) {
      setAuthed(true);
      setChecking(false);
      return;
    }

    const syncSession = async () => {
      let hasSession = false;
      try {
        const sessionResult = await supabase.auth.getSession();
        hasSession = Boolean(sessionResult.data.session);
      } catch {
        hasSession = false;
      }

      if (!mounted) {
        return;
      }

      setAuthed(hasSession);
      setChecking(false);

      if (!hasSession) {
        const nextPath = pathname || "/";
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      }
    };

    syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = Boolean(session);
      setAuthed(hasSession);
      if (!hasSession) {
        const nextPath = pathname || "/";
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return null;
  }

  if (!authed) {
    return null;
  }

  return <>{children}</>;
}
