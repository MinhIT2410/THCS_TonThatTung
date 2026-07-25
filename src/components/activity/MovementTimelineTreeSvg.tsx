import React from 'react';

export const TIMELINE_COLORS = [
  '#60A5FA', // Blue
  '#A21CAF', // Purple
  '#F43F5E', // Rose
  '#FB923C', // Orange
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#7C3AED', // Violet
];

interface MovementTimelineTreeSvgProps {
  count: number;
  width: number;
  itemWidth: number;
  gap: number;
  sidePadding: number;
  colors?: string[];
  className?: string;
}

export function MovementTimelineTreeSvg({
  count,
  width,
  itemWidth,
  gap,
  sidePadding,
  colors = TIMELINE_COLORS,
  className = '',
}: MovementTimelineTreeSvgProps) {
  const height = 160;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full overflow-visible pointer-events-none ${className}`}
    >
      <defs>
        {/* Symmetric Oval Leaf Path with pointed ends (~25-35% larger) */}
        <path
          id="timeline-leaf-shape"
          d="M 0 0 C 15 -20 40 -20 56 0 C 40 20 15 20 0 0 Z"
        />
      </defs>

      {/* Main horizontal tree trunk line (thick black line) */}
      <path
        d={`M 25 80 H ${width - 55}`}
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        className="text-[#0b0b0b] dark:text-slate-100"
      />

      {/* Nodes & Leaf clusters for each timeline item */}
      {Array.from({ length: count }).map((_, idx) => {
        const isEven = idx % 2 === 0;
        const color = colors[idx % colors.length];
        const x = sidePadding + idx * (itemWidth + gap) + itemWidth / 2;
        const y = 80;

        return (
          <g key={idx}>
            {/* 1. Branch stem & leaves */}
            {isEven ? (
              /* TOP CLUSTER (Lá chính hướng LÊN) */
              <g>
                {/* Short stem curve */}
                <path
                  d={`M ${x} ${y} Q ${x - 8} ${y - 18} ${x - 18} ${y - 36}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="text-[#0b0b0b] dark:text-slate-100"
                />
                {/* Main colored leaf */}
                <g transform={`translate(${x - 18}, ${y - 36}) rotate(-65)`}>
                  <use href="#timeline-leaf-shape" fill={color} />
                </g>
                {/* Secondary small black leaf 1 (Top Right) */}
                <g transform={`translate(${x + 18}, ${y - 30}) rotate(-25) scale(0.5)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
                {/* Secondary small black leaf 2 (Bottom Left) */}
                <g transform={`translate(${x - 22}, ${y - 10}) rotate(140) scale(0.5)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
                {/* Secondary small black leaf 3 (Bottom Right) */}
                <g transform={`translate(${x + 20}, ${y + 14}) rotate(35) scale(0.5)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
              </g>
            ) : (
              /* BOTTOM CLUSTER (Lá chính hướng DƯỚI) */
              <g>
                {/* Short stem curve */}
                <path
                  d={`M ${x} ${y} Q ${x + 8} ${y + 18} ${x + 18} ${y + 36}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="text-[#0b0b0b] dark:text-slate-100"
                />
                {/* Main colored leaf */}
                <g transform={`translate(${x + 18}, ${y + 36}) rotate(115)`}>
                  <use href="#timeline-leaf-shape" fill={color} />
                </g>
                {/* Secondary small black leaf 1 (Top Left) */}
                <g transform={`translate(${x - 22}, ${y - 12}) rotate(-140) scale(0.5)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
                {/* Secondary small black leaf 2 (Top Right) */}
                <g transform={`translate(${x + 18}, ${y - 30}) rotate(-25) scale(0.5)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
                {/* Secondary small black leaf 3 (Bottom Left) */}
                <g transform={`translate(${x - 22}, ${y + 14}) rotate(140) scale(0.5)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
              </g>
            )}

            {/* 2. Center Node circle on the trunk (diameter 17px) */}
            <circle
              cx={x}
              cy={y}
              r={8.5}
              fill="#ffffff"
              stroke={color}
              strokeWidth="3.5"
              className="dark:fill-slate-900"
            />
            <circle cx={x} cy={y} r={3} fill={color} />
          </g>
        );
      })}

      {/* End leaf arrowhead at right tip of tree branch (length 50px, height 24px) */}
      <path
        d={`M ${width - 55} 80 C ${width - 40} 68, ${width - 15} 68, ${width - 5} 80 C ${width - 15} 92, ${width - 40} 92, ${width - 55} 80 Z`}
        fill="currentColor"
        className="text-[#0b0b0b] dark:text-slate-100"
      />
    </svg>
  );
}
