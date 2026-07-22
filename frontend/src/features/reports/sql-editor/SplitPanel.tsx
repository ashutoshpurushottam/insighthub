import React, { useCallback, useRef, useState } from 'react';

import type { SplitPanelProps } from './sql-editor.types';

/**
 * Vertical split panel with a draggable divider handle.
 * Divides top and bottom content areas using flexbox.
 * Respects minimum height constraints on both panels.
 */
export function SplitPanel({
  topContent,
  bottomContent,
  initialTopRatio = 0.6,
  minTopHeight = 200,
  minBottomHeight = 100,
}: SplitPanelProps) {
  const [topRatio, setTopRatio] = useState(initialTopRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target.setPointerCapture) {
        target.setPointerCapture(e.pointerId);
      }
      setIsDragging(true);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerHeight = rect.height;

      // Calculate raw ratio from pointer Y position relative to container
      const offsetY = e.clientY - rect.top;
      let newRatio = offsetY / containerHeight;

      // Clamp ratio so neither panel goes below its minimum height
      const minTopRatio = minTopHeight / containerHeight;
      const maxTopRatio = (containerHeight - minBottomHeight) / containerHeight;

      newRatio = Math.max(minTopRatio, Math.min(maxTopRatio, newRatio));

      setTopRatio(newRatio);
    },
    [isDragging, minTopHeight, minBottomHeight],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.releasePointerCapture) {
        target.releasePointerCapture(e.pointerId);
      }
      setIsDragging(false);
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Top panel */}
      <div
        style={{
          flex: `0 0 ${topRatio * 100}%`,
          minHeight: `${minTopHeight}px`,
          overflow: 'auto',
        }}
      >
        {topContent}
      </div>

      {/* Draggable divider handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panels"
        tabIndex={0}
        style={{
          flex: '0 0 6px',
          cursor: 'row-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDragging ? '#d1d5db' : '#e5e7eb',
          transition: isDragging ? 'none' : 'background-color 150ms',
        }}
        onPointerDown={handlePointerDown}
      >
        {/* Grip dots visual indicator */}
        <div
          style={{
            width: '32px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: '#9ca3af',
          }}
        />
      </div>

      {/* Bottom panel */}
      <div
        style={{
          flex: 1,
          minHeight: `${minBottomHeight}px`,
          overflow: 'auto',
        }}
      >
        {bottomContent}
      </div>
    </div>
  );
}
