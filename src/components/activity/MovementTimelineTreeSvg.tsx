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
  const height = 120;
  const y = 60;

  if (count <= 0) return null;

  const firstNodeX = sidePadding + itemWidth / 2;
  const lastNodeX = sidePadding + (count - 1) * (itemWidth + gap) + itemWidth / 2;

  // Trunk bounds: starts ~60px before first node, ends ~60px after last node
  const trunkStartX = Math.max(15, firstNodeX - 60);
  const trunkEndX = lastNodeX + 60;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full overflow-visible pointer-events-none ${className}`}
    >
      <defs>
        {/* Pointed Leaf Shape without stem (~34px length, ~20px width) */}
        <path
          id="timeline-leaf-shape"
          d="M 0 0 C 9 -13 24 -13 34 0 C 24 13 9 13 0 0 Z"
        />
      </defs>

      {/* Main horizontal tree trunk line (thick 7.5px black line) */}
      <path
        d={`M ${trunkStartX} ${y} H ${trunkEndX}`}
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinecap="round"
        className="text-[#0b0b0b] dark:text-slate-100"
      />

      {/* Nodes & Stemless Leaf clusters for each timeline item */}
      {Array.from({ length: count }).map((_, idx) => {
        const isEven = idx % 2 === 0;
        const color = colors[idx % colors.length];
        const x = sidePadding + idx * (itemWidth + gap) + itemWidth / 2;

        return (
          <g key={idx}>
            {/* Stemless Leaves placed directly around node (8-12px from line center) */}
            {isEven ? (
              /* TOP NODE LEAVES */
              <g>
                {/* Main colored leaf (Top) - ~10px from trunk line */}
                <g transform={`translate(${x - 8}, ${y - 10}) rotate(-52)`}>
                  <use href="#timeline-leaf-shape" fill={color} />
                </g>
                {/* Secondary small black leaf 1 (Top-Right) - ~8px from trunk line */}
                <g transform={`translate(${x + 10}, ${y - 8}) rotate(-20) scale(0.48)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
                {/* Secondary small black leaf 2 (Bottom-Right) - ~6px from trunk line */}
                <g transform={`translate(${x + 10}, ${y + 6}) rotate(30) scale(0.48)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
              </g>
            ) : (
              /* BOTTOM NODE LEAVES */
              <g>
                {/* Main colored leaf (Bottom) - ~10px from trunk line */}
                <g transform={`translate(${x + 6}, ${y + 10}) rotate(122)`}>
                  <use href="#timeline-leaf-shape" fill={color} />
                </g>
                {/* Secondary small black leaf 1 (Top-Left) - ~8px from trunk line */}
                <g transform={`translate(${x - 10}, ${y - 8}) rotate(-140) scale(0.48)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
                {/* Secondary small black leaf 2 (Bottom-Left) - ~6px from trunk line */}
                <g transform={`translate(${x - 10}, ${y + 6}) rotate(140) scale(0.48)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
              </g>
            )}

            {/* Center Node circle on the trunk (diameter 17px) */}
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

      {/* End leaf arrowhead at right tip of tree trunk */}
      <path
        d={`M ${trunkEndX} ${y} C ${trunkEndX + 12} ${y - 10}, ${trunkEndX + 28} ${y - 10}, ${trunkEndX + 38} ${y} C ${trunkEndX + 28} ${y + 10}, ${trunkEndX + 12} ${y + 10}, ${trunkEndX} ${y} Z`}
        fill="currentColor"
        className="text-[#0b0b0b] dark:text-slate-100"
      />
    </svg>
  );
}

