import { useState } from "react";
import { TableFilter } from "../logs/log-table";
import { SearchInput } from "./search-input";
import { DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

export function FilterDropdownContent({ filter }: { filter: TableFilter }) {
  const [search, setSearch] = useState("");
  const hiddenSet = new Set(filter.hiddenValues);
  const filtered = search
    ? filter.options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : filter.options;

  return (
    <>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={`Search ${filter.label}…`}
        onEnter={() => {
          if (filtered.length === 1) filter.onToggle(filtered[0], hiddenSet.has(filtered[0]));
        }}
      />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Filter by {filter.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!search && (
          <>
            <div
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              onClick={() => filter.onSetAll(hiddenSet.size > 0)}
            >
              <Checkbox
                checked={
                  hiddenSet.size === 0
                    ? true
                    : hiddenSet.size === filter.options.length
                      ? false
                      : false
                }
                className="pointer-events-none"
              />
              <span>All</span>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {filtered.map((value) => (
          <div
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
            onClick={() => filter.onToggle(value, hiddenSet.has(value))}
          >
            <Checkbox checked={!hiddenSet.has(value)} className="pointer-events-none" />
            {filter.renderOption ? (
              filter.renderOption(value)
            ) : (
              <span className="font-mono">{value}</span>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No results.</p>
        )}
      </DropdownMenuGroup>
    </>
  );
}
