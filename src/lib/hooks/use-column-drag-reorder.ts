"use client";

import { useRef, useState, type DragEvent } from "react";
import type { ColumnOrderState } from "@tanstack/react-table";

type SetColumnOrder = (
  value: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)
) => void;

/**
 * Drag-to-reorder table columns: tracks which column is being dragged and
 * which one it's currently hovering over (for a drop-target indicator), and
 * reorders `columnOrder` via `setColumnOrder` when dropped.
 */
export function useColumnDragReorder(setColumnOrder: SetColumnOrder) {
  const dragColId = useRef<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  function handleDragStart(colId: string) {
    dragColId.current = colId;
  }

  function handleDragOver(e: DragEvent, colId: string) {
    e.preventDefault();
    if (dragColId.current && dragColId.current !== colId) {
      setDragOverColId(colId);
    }
  }

  function handleDrop(targetColId: string) {
    const from = dragColId.current;
    if (!from || from === targetColId) return;
    setColumnOrder((prev) => {
      const order = [...prev];
      const fromIdx = order.indexOf(from);
      const toIdx = order.indexOf(targetColId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, from);
      return order;
    });
    dragColId.current = null;
    setDragOverColId(null);
  }

  function handleDragEnd() {
    dragColId.current = null;
    setDragOverColId(null);
  }

  return {
    dragOverColId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
