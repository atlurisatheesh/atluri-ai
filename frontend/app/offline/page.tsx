export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-center px-6">
      <div className="text-5xl mb-4">📡</div>
      <h1 className="text-2xl font-bold text-[#F0F0FF] mb-2">You&apos;re Offline</h1>
      <p className="text-[#8B8BA7] max-w-sm">
        InterviewGenius needs an internet connection for live interview sessions.
        Check your connection and try again.
      </p>
      <button
        onClick={() => typeof window !== "undefined" && window.location.reload()}
        className="mt-6 px-6 py-3 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] text-sm font-medium hover:bg-[#00D4FF]/20 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
