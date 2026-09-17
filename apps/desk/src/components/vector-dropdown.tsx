"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "./glyphs";

/**
 * The attack-vector picker on the dashboard bench.
 *
 * This replaces a native <select>. The reason is grouping: sixteen vectors
 * across six families are only navigable if the family headings are visible,
 * and <optgroup> cannot be styled to match this page in any browser. A listbox
 * we own can be.
 *
 * What a native select gave us for free and is therefore reimplemented below,
 * because dropping any of it would be a regression rather than a restyle:
 *
 *   - keyboard: Up/Down move the active option, Home/End jump, Enter/Space
 *     commit, Escape closes without changing the value, Tab closes and moves on
 *   - the listbox/option ARIA contract, with aria-activedescendant so a screen
 *     reader announces the option the keyboard is on
 *   - focus returning to the trigger when the list closes
 *   - click-outside and scroll-away dismissal
 *
 * Animation is CSS transition on a data attribute, matching motion.tsx and the
 * rest of the site. No animation library is used anywhere in this app, and one
 * dropdown is not a reason to add ~60KB and a second styling idiom. The
 * `prefers-reduced-motion` block in globals.css already neutralises these
 * transitions, so reduced-motion users get an instant open with no extra code.
 */

export interface VectorOption {
  id: string;
  label: string;
  family: string;
}

export function VectorDropdown({
  options,
  value,
  onChange,
  labelId,
}: {
  options: VectorOption[];
  value: string;
  onChange: (id: string) => void;
  /** id of the visible label element, so the trigger is named by it. */
  labelId: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIndex = options.findIndex((o) => o.id === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Open onto the current selection rather than the top of the list, so
  // reopening a long list does not lose the reader's place.
  function openList() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function closeList({ refocus }: { refocus: boolean }) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function commit(index: number) {
    const option = options[index];
    if (option) onChange(option.id);
    closeList({ refocus: true });
  }

  /*
   * Dismissal. `mousedown` rather than `click` so the list closes on press
   * instead of release, which is what every native menu does; `scroll` in
   * capture phase catches scrolling inside any ancestor, not just the window,
   * since an absolutely positioned list would otherwise detach from its
   * trigger.
   */
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    /*
     * Close on scroll, but never on a scroll this component caused.
     *
     * Opening focuses the list and scrolls the active option into view; both
     * emit scroll events. Without this guard the list closed itself in the same
     * frame it opened, which looked exactly like the click not registering.
     * Only scrolls of an ancestor — the page moving underneath an absolutely
     * positioned list — should dismiss it.
     */
    function onScroll(event: Event) {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  /*
   * Move focus into the list when it opens, and keep the keyboard-active option
   * scrolled into view. The focus move is what makes the arrow keys work at
   * all: onListKeyDown is bound to the list, so without focus here the keydown
   * would still be on the trigger and nothing would respond.
   */
  useEffect(() => {
    if (!open) return;
    // preventScroll: focusing a tall list would otherwise scroll an ancestor,
    // which the dismiss-on-scroll handler above would read as the page moving.
    listRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openList();
    }
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        closeList({ refocus: true });
        break;
      case "Tab":
        // Let focus move on, but do not leave an orphaned list behind it.
        setOpen(false);
        break;
    }
  }

  return (
    // Raised while open so the list paints over the panel below the bench.
    // The z-index goes on the root, not the list: sibling <Panel> sections are
    // unpositioned, so they are ordered against this root rather than against
    // anything inside it. Back to auto when closed.
    <div
      ref={rootRef}
      className={`relative ${open ? "z-40" : ""}`}
      data-state={open ? "open" : "closed"}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${listId}-value`}
        onClick={() => (open ? closeList({ refocus: false }) : openList())}
        onKeyDown={onTriggerKeyDown}
        className="mt-[var(--spacing-8)] flex w-full items-center justify-between gap-[var(--spacing-12)] rounded-[var(--radius-nested-cards)] border border-bone bg-soft-mist px-[var(--spacing-12)] py-[var(--spacing-12)] text-left font-mono text-[13px] text-obsidian outline-none transition-colors duration-200 hover:border-graphite focus-visible:border-graphite"
      >
        <span id={`${listId}-value`} className="min-w-0 truncate">
          {selected ? `${selected.id} · ${selected.label}` : "Select a vector"}
        </span>
        {/*
          The chevron rotates to point at the list it opened. `shrink-0` because
          a long vector label would otherwise squeeze the icon to nothing.
        */}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-graphite transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/*
        Kept mounted while closed so the close is animated too. `invisible`
        takes it out of hit-testing and out of the accessibility tree (unlike
        opacity-0, which leaves it readable to a screen reader), and
        `pointer-events-none` covers the transition window while it is still
        fading but no longer meant to be clickable.
      */}
      <div
        id={listId}
        ref={listRef}
        role="listbox"
        aria-labelledby={labelId}
        aria-activedescendant={open ? `${listId}-opt-${activeIndex}` : undefined}
        tabIndex={-1}
        onKeyDown={onListKeyDown}
        className={`absolute left-0 right-0 top-[calc(100%+var(--spacing-4))] z-50 max-h-[280px] overflow-y-auto rounded-[var(--radius-nested-cards)] border border-bone bg-pure-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-[opacity,transform] duration-200 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible -translate-y-[4px] scale-[0.98] opacity-0"
        }`}
      >
        {options.map((option, index) => {
          const isSelected = option.id === value;
          const isActive = index === activeIndex;
          // A family heading is printed once, above the first vector in it.
          const startsFamily = index === 0 || options[index - 1]?.family !== option.family;

          return (
            <div key={option.id}>
              {startsFamily && (
                <div
                  role="presentation"
                  className="border-b border-bone bg-soft-mist px-[var(--spacing-12)] py-[var(--spacing-8)] font-mono text-[10px] uppercase tracking-[0.55px] text-smoke"
                >
                  {option.label}
                </div>
              )}
              <div
                id={`${listId}-opt-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onClick={() => commit(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`cursor-pointer px-[var(--spacing-12)] py-[var(--spacing-12)] font-mono text-[13px] transition-colors duration-150 ${
                  isActive ? "bg-soft-mist text-obsidian" : "text-graphite"
                } ${isSelected ? "text-obsidian" : ""}`}
              >
                {option.id}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
