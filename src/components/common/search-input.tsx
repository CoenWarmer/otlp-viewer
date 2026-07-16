import { useEffect, useRef } from "react";

export function SearchInput({
  value,
  onChange,
  onEnter,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="px-2 pt-2 pb-1">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key !== "Escape") e.stopPropagation();
          if (e.key === "Enter") onEnter?.();
        }}
        className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:border-ring"
      />
    </div>
  );
}
