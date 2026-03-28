/**
 * CompetencyRadar — 6-dimension radar chart for post-session analytics.
 * Renders a pure CSS/SVG radar without external chart libraries.
 */

'use client';

import React from 'react';

interface RadarDimension {
  name: string;
  score: number;
  maxScore: number;
  color: string;
}

interface CompetencyRadarProps {
  dimensions: RadarDimension[];
  className?: string;
}

const DEFAULT_DIMENSIONS: RadarDimension[] = [
  { name: 'Communication', score: 0, maxScore: 10, color: '#22d3ee' },
  { name: 'Technical', score: 0, maxScore: 10, color: '#a78bfa' },
  { name: 'Leadership', score: 0, maxScore: 10, color: '#f59e0b' },
  { name: 'Problem Solving', score: 0, maxScore: 10, color: '#34d399' },
  { name: 'Culture Fit', score: 0, maxScore: 10, color: '#f472b6' },
  { name: 'Strategic', score: 0, maxScore: 10, color: '#60a5fa' },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

export default function CompetencyRadar({
  dimensions = DEFAULT_DIMENSIONS,
  className = '',
}: CompetencyRadarProps) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 110;
  const levels = 5;
  const n = dimensions.length;
  const angleStep = 360 / n;

  // Grid lines (concentric pentagons)
  const gridPaths = Array.from({ length: levels }, (_, level) => {
    const r = (maxR / levels) * (level + 1);
    const points = Array.from({ length: n }, (_, i) => {
      const p = polarToCartesian(cx, cy, r, i * angleStep);
      return `${p.x},${p.y}`;
    });
    return `M${points.join('L')}Z`;
  });

  // Axis lines
  const axisLines = dimensions.map((_, i) => {
    const p = polarToCartesian(cx, cy, maxR, i * angleStep);
    return { x1: cx, y1: cy, x2: p.x, y2: p.y };
  });

  // Data polygon
  const dataPoints = dimensions.map((dim, i) => {
    const ratio = Math.min(dim.score / dim.maxScore, 1);
    const r = ratio * maxR;
    return polarToCartesian(cx, cy, r, i * angleStep);
  });
  const dataPath = `M${dataPoints.map(p => `${p.x},${p.y}`).join('L')}Z`;

  // Labels
  const labels = dimensions.map((dim, i) => {
    const labelR = maxR + 24;
    const p = polarToCartesian(cx, cy, labelR, i * angleStep);
    return { ...dim, x: p.x, y: p.y };
  });

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {gridPaths.map((d, i) => (
          <path
            key={`grid-${i}`}
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Axes */}
        {axisLines.map((line, i) => (
          <line
            key={`axis-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}

        {/* Data fill */}
        <path
          d={dataPath}
          fill="rgba(34, 211, 238, 0.12)"
          stroke="rgba(34, 211, 238, 0.6)"
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill={dimensions[i].color}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1}
          />
        ))}

        {/* Labels */}
        {labels.map((label, i) => (
          <text
            key={`label-${i}`}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-neutral-400 text-[10px]"
          >
            {label.name}
          </text>
        ))}
      </svg>

      {/* Score summary below chart */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-2 mt-4">
        {dimensions.map((dim, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full bg-[var(--dot-color)]"
              ref={(el) => { if (el) el.style.setProperty('--dot-color', dim.color); }}
            />
            <span className="text-neutral-500">{dim.name}</span>
            <span className="text-neutral-200 font-medium ml-auto">
              {dim.score.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
