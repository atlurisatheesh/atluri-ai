"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const E2E_BYPASS_KEY = "atluriin.e2e.bypass";

function shouldBypassAuth(): boolean {
  if (process.env.NEXT_PUBLIC_E2E_BYPASS_AUTH === "true") {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(E2E_BYPASS_KEY) === "1";
  } catch {
    return false;
  }
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
