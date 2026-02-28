"use client";

type BannerType = "error" | "success" | "info";

export default function StatusBanner({
  type,
  message,
  actionLabel,
  onAction,
}: {
  type: BannerType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!message) return null;

  const palette =
    type === "error"
      ? {
          background: "#fef2f2",
          border: "#fecaca",
          color: "#991b1b",
        }
      : type === "success"
      ? {
          background: "#ecfdf5",
          border: "#a7f3d0",
          color: "#065f46",
        }
      : {
          background: "#eff6ff",
          border: "#bfdbfe",
          color: "#1d4ed8",
        };

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 10,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1.4 }}>{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            border: "1px solid currentColor",
            background: "transparent",
            color: "inherit",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
