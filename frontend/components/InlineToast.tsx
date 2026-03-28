type InlineToastProps = {
  message: string;
};

export default function InlineToast({ message }: InlineToastProps) {
  if (!message) return null;

  return (
    <div className="fixed right-[18px] bottom-[18px] z-[90] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)] py-2.5 px-3 text-xs max-w-[320px]" role="status" aria-live="polite">
      {message}
    </div>
  );
}

