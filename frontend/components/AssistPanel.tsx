"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./AssistPanel.module.css";

export interface AssistHint {
  rule_id: string;
  text: string;
  severity: "low" | "medium" | "high";
  confidence: number;
}

export default function AssistPanel({
  hint,
  intensity,
  onIntensityChange,
  intensitySaving,
}: {
  hint: AssistHint | null;
  intensity: 1 | 2 | 3;
  onIntensityChange: (level: 1 | 2 | 3) => void;
  intensitySaving?: boolean;
}) {
  const [visibleHint, setVisibleHint] = useState<AssistHint | null>(null);

  useEffect(() => {
    if (!hint) {
      return;
    }

    setVisibleHint(hint);

    const timer = window.setTimeout(() => {
      setVisibleHint(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [hint]);

  const severityClass = useMemo(() => {
    if (!visibleHint) return "";
    if (visibleHint.severity === "high") return styles.cardHigh;
    if (visibleHint.severity === "low") return styles.cardLow;
    return styles.cardMedium;
  }, [visibleHint]);

  return (
    <aside className={styles.panel}>
      <div className={styles.headerRow}>
        <div className={styles.label}>Live Assist</div>
      </div>

      <div className={styles.intensityWrap}>
        <div className={styles.intensityLabel}>Assist Intensity</div>
        <div className={styles.intensityButtons}>
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              type="button"
              className={`${styles.intensityButton} ${intensity === level ? styles.intensityButtonActive : ""}`}
              onClick={() => onIntensityChange(level as 1 | 2 | 3)}
              disabled={Boolean(intensitySaving)}
            >
              {level === 1 ? "Low" : level === 2 ? "Medium" : "High"}
            </button>
          ))}
        </div>
      </div>

      {visibleHint ? (
        <div className={`${styles.card} ${severityClass}`}>
          <div className={styles.hintText}>{visibleHint.text}</div>
          <div className={styles.meta}>Confidence: {Math.round((visibleHint.confidence || 0) * 100)}%</div>
        </div>
      ) : (
        <div className={styles.empty}>Listening…</div>
      )}
    </aside>
  );
}
