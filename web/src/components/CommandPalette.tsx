import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useContentState } from "@/content/ContentProvider";
import { searchItems } from "@/content/model";
import { sectionMeta } from "@/content/sections";
import { buildIndex, search, stem, words, type SearchHit } from "@/lib/search";
import { Icon } from "./Icon";
import { readJson, writeJson } from "@/lib/storage";

const RECENT = "tk-recent-search";
const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
import s from "./CommandPalette.module.css";

// Search everything: ⌘K / Ctrl+K, "/", or any open() call (sidebar box, top bar, phone tab).
// Opened from the keyboard many times a day, so it appears almost at once (120 ms fade, no scale).

const Ctx = createContext<{ open: () => void } | null>(null);

export function useCommandPalette(): { open: () => void } {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommandPalette must be used inside <CommandPaletteProvider>");
  return v;
}

const isTyping = (el: Element | null) => !!el && (/^(input|textarea|select)$/i.test(el.tagName) || (el as HTMLElement).isContentEditable);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !isTyping(document.activeElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && <Palette onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}

function highlight(text: string, query: string): ReactNode {
  const terms = words(query).map(stem); // highlight the matched start of each word ("Cach" in "Caching")
  if (!terms.length) return text;
  const re = new RegExp(`\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

function Palette({ onClose }: { onClose: () => void }) {
  const content = useContentState();
  const navigate = useNavigate();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<Element | null>(document.activeElement);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const index = useMemo(() => (content.status === "success" ? buildIndex(searchItems(content.data.site, content.data.articles)) : []), [content]);
  const hits: SearchHit[] = useMemo(() => {
    if (query.trim()) return search(index, query);
    // empty query: what was opened lately, then the sections and pages, a quick way to jump anywhere
    const recent = readJson<string[]>(RECENT, [], isIds).flatMap((id) => index.filter(({ item }) => item.id === id).map(({ item }) => ({ ...item, group: "Recent" as const, score: 0 })));
    const seen = new Set(recent.map((r) => r.id));
    return [...recent, ...index.filter(({ item }) => (item.group === "Sections" || item.group === "Pages") && !seen.has(item.id)).map(({ item }) => ({ ...item, score: 0 }))];
  }, [index, query]);

  useEffect(() => {
    input.current?.focus();
    const prev = returnFocus.current;
    return () => (prev as HTMLElement | null)?.focus?.({ preventScroll: true });
  }, []);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const go = (hit: SearchHit | undefined) => {
    if (!hit) return;
    writeJson(RECENT, [hit.id, ...readJson<string[]>(RECENT, [], isIds).filter((x) => x !== hit.id)].slice(0, 5));
    onClose();
    navigate(hit.href);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = hits.length || 1;
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = "";
  return (
    <div className={s.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.box} role="dialog" aria-modal="true" aria-label="Search">
        <div className={s.inputRow}>
          <Icon name="search" size={18} />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search lessons, problems and pages"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={hits.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={s.kbd}>Esc</kbd>
        </div>
        <div className={s.results} id={listId} role="listbox" aria-label="Results">
          {content.status === "loading" && <p className={s.empty}>Loading…</p>}
          {content.status === "error" && <p className={s.empty}>Search isn't available: {content.error.message}</p>}
          {content.status === "success" && hits.length === 0 && <p className={s.empty}>Nothing matches “{query}”. Try “cache”, “chat” or “kafka”.</p>}
          {hits.map((hit, i) => {
            const head = hit.group !== lastGroup ? <h3 className={s.group}>{(lastGroup = hit.group)}</h3> : null;
            const accent = hit.section === "problems" ? "problems" : hit.section ? sectionMeta(hit.section)?.accent : undefined;
            return (
              <div key={hit.id}>
                {head}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={s.option}
                  data-accent={accent}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(hit)}
                >
                  <i className={s.dot} aria-hidden="true" />
                  <span className={s.title}>{highlight(hit.title, query)}</span>
                  <small className={s.detail}>{hit.group === "Lessons" ? hit.detail.split(" · ")[0] : hit.detail}</small>
                </div>
              </div>
            );
          })}
        </div>
        <div className={s.foot}>
          <span><kbd className={s.kbd}>↑</kbd> <kbd className={s.kbd}>↓</kbd> move</span>
          <span><kbd className={s.kbd}>↵</kbd> open</span>
        </div>
      </div>
    </div>
  );
}
