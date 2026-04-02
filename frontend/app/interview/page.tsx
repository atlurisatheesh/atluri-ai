"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import InterviewWizard from "../../components/interview/InterviewWizard";
import LiveVoiceInterview from "./voice/live/page";
import AuthGate from "../../components/AuthGate";

export default function InterviewPage() {
  const [started, setStarted] = useState(false);
  const [wizardConfig, setWizardConfig] = useState<any>(null);

  if (started) {
    return <LiveVoiceInterview />;
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-canvas text-textPrimary flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl"
        >
          <InterviewWizard
            onStart={(config) => {
              setWizardConfig(config);
              if (config.scenario) {
                try { localStorage.setItem("atluriin.interview.scenario", config.scenario); } catch {}
              } else {
                try { localStorage.removeItem("atluriin.interview.scenario"); } catch {}
              }
              setStarted(true);
            }}
          />
        </motion.div>
      </div>
    </AuthGate>
  );
}
