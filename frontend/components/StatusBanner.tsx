"use client";

type BannerType = "error" | "success" | "info";

const bannerClasses: Record<BannerType, string> = {
  error: "bg-[#fef2f2] border-[#fecaca] text-[#991b1b]",
  success: "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]",
  info: "bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]",
};

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

  return (
    <div
      className={`mt-3 rounded-[10px] border py-2.5 px-3 flex items-center justify-between gap-2.5 ${bannerClasses[type]}`}
    >
      <span className="text-[13px] leading-[1.4]">{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="border border-current bg-transparent text-inherit rounded-lg py-1.5 px-2.5 cursor-pointer font-semibold text-xs whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
