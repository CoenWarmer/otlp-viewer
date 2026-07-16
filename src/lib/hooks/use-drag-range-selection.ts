"use client";

import { useEffect, useState } from "react";
import type { MouseHandlerDataParam } from "recharts";
import type { TimeRange } from "@/lib/types/common";

interface UseDragRangeSelectionOptions {
  /** Width of one chart bucket (ms) — extends the selection to cover the full last bucket. */
  bucketSize: number;
  selectedRange?: TimeRange | null;
  onRangeSelect?: (range: TimeRange | null) => void;
}

/**
 * Drag-to-select a time range on a bar chart whose x-axis reports the
 * hovered bucket via Recharts' `activeLabel` (a numeric bucket start time).
 *
 * Returns mouse handlers to wire up to the chart, plus `refLeft`/`refRight`
 * describing what to visually highlight: the in-progress drag while
 * dragging, or the externally-applied `selectedRange` otherwise.
 */
export function useDragRangeSelection({
  bucketSize,
  selectedRange,
  onRangeSelect,
}: UseDragRangeSelectionOptions) {
  // Both must be state so the visual selection re-renders on change.
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const isDragging = dragStart !== null;

  // Cancel drag if the mouse is released outside the chart.
  useEffect(() => {
    function onGlobalMouseUp() {
      if (isDragging) {
        setDragStart(null);
        setDragEnd(null);
      }
    }
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, [isDragging]);

  // Recharts v3's mouse handlers report the active x-axis value via
  // `activeLabel` (not a data payload) — since our x-axis dataKey is the
  // numeric bucket `time`, that value *is* the bucket time directly.
  function getTime(state: MouseHandlerDataParam): number | null {
    return typeof state.activeLabel === "number" ? state.activeLabel : null;
  }

  function handleMouseDown(state: MouseHandlerDataParam) {
    const t = getTime(state);
    if (t == null) return;
    setDragStart(t);
    setDragEnd(t);
  }

  function handleMouseMove(state: MouseHandlerDataParam) {
    if (!isDragging) return;
    const t = getTime(state);
    if (t != null) setDragEnd(t);
  }

  function handleMouseUp() {
    if (!isDragging || dragEnd == null) return;
    const start = Math.min(dragStart!, dragEnd);
    const end = Math.max(dragStart!, dragEnd) + bucketSize;
    if (end > start) onRangeSelect?.({ start, end });
    setDragStart(null);
    setDragEnd(null);
  }

  // What to show: the in-progress drag, or the externally-applied selection.
  const refLeft = isDragging
    ? Math.min(dragStart!, dragEnd ?? dragStart!)
    : (selectedRange?.start ?? null);
  const refRight = isDragging
    ? Math.max(dragStart!, dragEnd ?? dragStart!)
    : selectedRange != null
      ? selectedRange.end - bucketSize
      : null;

  return {
    isDragging,
    refLeft,
    refRight,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
