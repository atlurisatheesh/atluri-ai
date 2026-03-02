"use client";

interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
  circle?: boolean;
}

export default function SkeletonLoader({ className = "", lines = 3, circle = false }: SkeletonLoaderProps) {
  if (circle) {
    return <div className={`rounded-full shimmer ${className}`} />;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg shimmer"
          style={{ width: i === lines - 1 ? "60%" : `${85 + Math.random() * 15}%` }}
        />
      ))}
    </div>
  );
}
