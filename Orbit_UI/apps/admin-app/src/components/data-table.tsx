"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Returns sortable value; if omitted, column is not sortable */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
};

export type FilterDef<T> = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Returns the value to compare against the selected option */
  accessor: (row: T) => string;
};

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  /** Returns a concatenated searchable string for global text search */
  searchAccessor?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  /** Items revealed per infinite-scroll step. */
  pageSize?: number;
  /** Deprecated — kept for API compatibility but ignored. */
  pageSizeOptions?: number[];
  initialSort?: { key: string; direction: "asc" | "desc" };
  emptyMessage?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Max height for the scrolling viewport. */
  maxHeight?: string;
};

type SortState = { key: string; direction: "asc" | "desc" } | null;

export function DataTable<T>({
  data,
  columns,
  searchAccessor,
  searchPlaceholder = "Search...",
  filters = [],
  pageSize: stepSize = 25,
  initialSort = undefined,
  emptyMessage = "No results match your filters.",
  rowKey,
  onRowClick,
  maxHeight = "70vh",
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(initialSort ?? null);

  const filtered = useMemo(() => {
    let out = data;
    if (query && searchAccessor) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchAccessor(r).toLowerCase().includes(q));
    }
    for (const f of filters) {
      const v = activeFilters[f.key];
      if (v && v !== "__all__") {
        out = out.filter((r) => f.accessor(r) === v);
      }
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const dir = sort.direction === "asc" ? 1 : -1;
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
    }
    return out;
  }, [data, query, activeFilters, sort, columns, filters, searchAccessor]);

  const { visible, sentinelRef, hasMore, visibleCount, total } = useInfiniteScroll(filtered, { step: stepSize });

  const toggleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, direction: "asc" };
      if (prev.direction === "asc") return { key: col.key, direction: "desc" };
      return null;
    });
  };

  const setFilter = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const activeFilterCount =
    (query ? 1 : 0) +
    Object.values(activeFilters).filter((v) => v && v !== "__all__").length;

  const clearAll = () => {
    setQuery("");
    setActiveFilters({});
  };

  return (
    <div className="premium-card overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-background/40 shrink-0">
        {searchAccessor && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40 transition-all"
            />
          </div>
        )}

        {filters.map((f) => (
          <select
            key={f.key}
            value={activeFilters[f.key] ?? "__all__"}
            onChange={(e) => setFilter(f.key, e.target.value)}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40 cursor-pointer"
          >
            <option value="__all__">{f.label}: All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {f.label}: {o.label}
              </option>
            ))}
          </select>
        ))}

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}

        <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {total === data.length ? `${data.length} rows` : `${total} of ${data.length}`}
        </div>
      </div>

      {/* Table — scrolling viewport */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground sticky top-0 z-10">
            <tr>
              {columns.map((col) => {
                const isSortable = !!col.sortValue;
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "font-semibold px-4 py-3 whitespace-nowrap bg-muted/60 backdrop-blur",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      !col.align && "text-left",
                      isSortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                      col.headerClassName
                    )}
                    onClick={() => toggleSort(col)}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        col.align === "right" && "flex-row-reverse"
                      )}
                    >
                      {col.header}
                      {isSortable &&
                        (active ? (
                          sort!.direction === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-t hover:bg-accent/30 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
            {hasMore && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4">
                  <div ref={sentinelRef} className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading more…
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer status */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-t bg-background/40 text-[11px] text-muted-foreground tabular-nums shrink-0">
        <span>
          Showing <span className="font-semibold text-foreground">{visibleCount}</span> of {total}
          {total !== data.length && <span> (filtered from {data.length})</span>}
        </span>
        {!hasMore && total > 0 && <span>End of list</span>}
      </div>
    </div>
  );
}
