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

  // Trunk bounds: starts ~80px before first node, ends ~80px after last node
  const trunkStartX = Math.max(15, firstNodeX - 80);
  const trunkEndX = lastNodeX + 80;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full overflow-visible pointer-events-none ${className}`}
    >
      <defs>
        {/* Pointed Leaf Shape without stem (~36px length, ~21px width) */}
        <path
          id="timeline-leaf-shape"
          d="M 0 0 C 10 -14 26 -14 36 0 C 26 14 10 14 0 0 Z"
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
            {/* Stemless Leaves placed directly around node (no stem lines) */}
            {isEven ? (
              /* TOP NODE LEAVES */
              <g>
                {/* Main colored leaf (Top) */}
                <g transform={`translate(${x - 10}, ${y - 24}) rotate(-55)`}>
                  <use href="#timeline-leaf-shape" fill={color} />
                </g>
                {/* Secondary small black leaf 1 (Top-Right) */}
                <g transform={`translate(${x + 12}, ${y - 18}) rotate(-20) scale(0.48)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
                {/* Secondary small black leaf 2 (Bottom-Right) */}
                <g transform={`translate(${x + 14}, ${y + 10}) rotate(35) scale(0.48)`}>
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
                {/* Main colored leaf (Bottom) */}
                <g transform={`translate(${x + 8}, ${y + 24}) rotate(125)`}>
                  <use href="#timeline-leaf-shape" fill={color} />
                </g>
                {/* Secondary small black leaf 1 (Top-Left) */}
                <g transform={`translate(${x - 14}, ${y - 18}) rotate(-140) scale(0.48)`}>
                  <use
                    href="#timeline-leaf-shape"
                    fill="currentColor"
                    className="text-[#0b0b0b] dark:text-slate-100"
                  />
                </g>
                {/* Secondary small black leaf 2 (Bottom-Left) */}
                <g transform={`translate(${x - 14}, ${y + 10}) rotate(140) scale(0.48)`}>
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
        d={`M ${trunkEndX} ${y} C ${trunkEndX + 15} ${y - 12}, ${trunkEndX + 35} ${y - 12}, ${trunkEndX + 45} ${y} C ${trunkEndX + 35} ${y + 12}, ${trunkEndX + 15} ${y + 12}, ${trunkEndX} ${y} Z`}
        fill="currentColor"
        className="text-[#0b0b0b] dark:text-slate-100"
      />
    </svg>
  );
}

