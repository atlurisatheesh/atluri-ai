"use client";

/**
 * /overlay — Dedicated route for the Electron desktop overlay window.
 *
 * This page renders ONLY the PhantomOverlay component (no dashboard shell,
 * no nav, no sidebar). The Electron overlay BrowserWindow loads this URL so
 * both the web demo and the desktop app share the same React component tree.
 *
 * Communication with the Electron main process flows through the
 * `window.atluriinDesktop` IPC bridge (set up by preload.ts).
 */

import { useEffect, useCallback, useState } from "react";
import PhantomOverlay from "@/components/stealth/PhantomOverlay";
import { usePhantomOverlay } from "@/lib/hooks/usePhantomOverlay";

export default function OverlayPage() {
    const phantom = usePhantomOverlay();
    const [ready, setReady] = useState(false);

    // ── Bootstrap: start session + show overlay once mounted ──
    useEffect(() => {
        phantom.setVisible(true);
        phantom.startSession();
        setReady(true);

        // Listen for IPC messages forwarded from Electron main process
        const bridge = typeof window !== "undefined" && (window as any).atluriinDesktop;
        if (bridge?.onWSMessage) {
            const unsub = bridge.onWSMessage((msg: { type: string; data: any }) => {
                phantom.handleWSMessage(msg.type, msg.data);
            });
            return () => { unsub?.(); };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── IPC control messages from main process (mic mute, AI pause, etc.) ──
    useEffect(() => {
        const bridge = typeof window !== "undefined" && (window as any).atluriinDesktop;
        if (!bridge) return;

        const handlers: Array<() => void> = [];

        if (bridge.onControlMicMuted) {
            handlers.push(bridge.onControlMicMuted((muted: boolean) => {
                phantom.setIsListening(!muted);
            }));
        }

        return () => handlers.forEach((unsub) => unsub?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleClose = useCallback(() => {
        const bridge = typeof window !== "undefined" && (window as any).atluriinDesktop;
        if (bridge?.minimizeOverlay) {
            bridge.minimizeOverlay();
        } else {
            phantom.setVisible(false);
        }
    }, [phantom]);

    const handleToggleVisibility = useCallback(() => {
        phantom.toggleVisibility();
    }, [phantom]);

    const handleToggleMic = useCallback(() => {
        phantom.toggleMic();
    }, [phantom]);

    if (!ready) return null;

    return (
        <div className="w-screen h-screen bg-transparent overflow-hidden">
            <PhantomOverlay
                visible={phantom.visible}
                onClose={handleClose}
                onToggleVisibility={handleToggleVisibility}
                transcript={phantom.transcript}
                aiResponse={phantom.aiResponse}
                coach={phantom.coach}
                deepThink={phantom.deepThink}
                isListening={phantom.isListening}
                onToggleMic={handleToggleMic}
                opacity={phantom.settings.opacity}
                position={phantom.settings.position}
                size={phantom.settings.size}
                streamingText={phantom.streamingText}
                isStreaming={phantom.isStreaming}
                elapsedSeconds={phantom.elapsedSeconds}
                offerProbability={phantom.offerProbability}
                answerHistory={phantom.answerHistory}
                historyIndex={phantom.historyIndex}
                onNavigateHistory={phantom.navigateHistory}
                stealthHealth={phantom.stealthHealth}
                threatToast={phantom.threatToast}
                onUpdateSettings={phantom.updateSettings}
            />
        </div>
    );
}
