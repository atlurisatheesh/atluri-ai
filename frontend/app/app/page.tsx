"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy /app route — redirects to the new /dashboard.
 * Keeps old bookmarks and OAuth callbacks working.
 */
export default function AppPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard"); }, [router]);
  return null;
}
