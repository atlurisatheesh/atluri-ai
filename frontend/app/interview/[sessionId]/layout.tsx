/**
 * Interview Layout — Minimal, focused, distraction-free
 */

import React from 'react';

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      {/* No navigation — full focus on interview */}
      {children}
    </div>
  );
}
