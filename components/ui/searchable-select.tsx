"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SearchableSelectProps {
  groups: SelectGroup[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  groups,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.toLowerCase().trim();

  const filteredGroups = q
    ? groups
        .map(g => ({ ...g, options: g.options.filter(o => o.label.toLowerCase().includes(q)) }))
        .filter(g => g.options.length > 0)
    : groups;

  const selectedLabel = groups.flatMap(g => g.options).find(o => o.value === value)?.label;

  function openDropdown() {
    if (disabled || !triggerRef.current) return;
    setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  function handleSelect(v: string) {
    onValueChange(v);
    closeDropdown();
  }

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const dropdown = document.getElementById("searchable-select-portal");
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdown?.contains(e.target as Node)
      ) return;
      closeDropdown();
    }
    function onScroll() { closeDropdown(); }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeDropdown(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const dropdown = open && rect ? (
    <div
      id="searchable-select-portal"
      style={{
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 240),
        zIndex: 9999,
      }}
      className="rounded-md border border-slate-200 bg-white shadow-lg"
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <Search size={12} className="shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {q && (
          <span className="text-[10px] text-slate-400">
            {filteredGroups.flatMap(g => g.options).length}
          </span>
        )}
      </div>

      {/* Options */}
      <div className="max-h-60 overflow-y-auto py-1">
        {filteredGroups.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-slate-400">No results for &ldquo;{query}&rdquo;</p>
        ) : (
          filteredGroups.map(group => (
            <div key={group.label}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              {group.options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onPointerDown={e => e.preventDefault()} // prevent blur before click
                  onClick={() => handleSelect(opt.value)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                >
                  <Check
                    size={12}
                    className={`shrink-0 ${value === opt.value ? "text-slate-700" : "opacity-0"}`}
                  />
                  <span className="flex-1 truncate text-slate-800">{opt.label}</span>
                  {opt.meta && <span className="text-[10px] text-slate-400">{opt.meta}</span>}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-sm transition-colors hover:border-slate-300 focus:outline-none disabled:opacity-50 ${
          open ? "border-slate-400" : "border-slate-200"
        }`}
      >
        <span className={`flex-1 truncate text-left ${selectedLabel ? "text-slate-800" : "text-slate-400"}`}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {typeof window !== "undefined" && createPortal(dropdown, document.body)}
    </>
  );
}
