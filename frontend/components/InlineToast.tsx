import type { CSSProperties } from "react";

type InlineToastProps = {
  message: string;
};

export default function InlineToast({ message }: InlineToastProps) {
  if (!message) return null;

  return (
    <div style={styles.toast} role="status" aria-live="polite">
      {message}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  toast: {
    position: "fixed",
    right: 18,
    bottom: 18,
    zIndex: 90,
    borderRadius: 8,
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    padding: "10px 12px",
    fontSize: 12,
    maxWidth: 320,
  },
};
