"use client";

import LiveVoiceInterview from "../voice/live/page";
import AuthGate from "../../../components/AuthGate";

export default function InterviewLivePage() {
  return (
    <AuthGate>
      <LiveVoiceInterview />
    </AuthGate>
  );
}
