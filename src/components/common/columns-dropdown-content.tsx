import { useState } from "react";
import { SearchInput } from "./search-input";
import { DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, Column } from "@tanstack/react-table";

export function ColumnsDropdownContent<TData>({
  hideableColumns,
  table,
}: {
  hideableColumns: Column<TData, unknown>[];
  table: Table<TData>;
}) {
  const [search, setSearch] = useState("");
  const getLabel = (col: Column<TData, unknown>) =>
    col.id.startsWith("attr:") ? col.id.slice(5) : col.id;
  const filtered = search
    ? hideableColumns.filter((c) => getLabel(c).toLowerCase().includes(search.toLowerCase()))
    : hideableColumns;
  const visibleCount = hideableColumns.filter((c) => c.getIsVisible()).length;
  const allVisible = visibleCount === hideableColumns.length;
  const noneVisible = visibleCount === 0;

  return (
    <>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search columns…"
        onEnter={() => {
          if (filtered.length === 1) filtered[0].toggleVisibility(!filtered[0].getIsVisible());
        }}
      />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Toggle attribute columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!search && (
          <>
            <div
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              onClick={() => table.toggleAllColumnsVisible(noneVisible)}
            >
              <Checkbox checked={allVisible ? true : false} className="pointer-events-none" />
              <span>{allVisible ? "All" : "None"}</span>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {filtered.map((col) => (
          <div
            key={col.id}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
            onClick={() => col.toggleVisibility(!col.getIsVisible())}
          >
            <Checkbox checked={col.getIsVisible()} className="pointer-events-none" />
            <span className="font-mono">{getLabel(col)}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No results.</p>
        )}
      </DropdownMenuGroup>
    </>
  );
}
