import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../core/format';
import { SearchField } from './fields';
import { IconButton } from './components';

/** Cards a long list draws at first, and adds each time the reader nears its end. */
const LIST_PAGE = 20;
/** How far below the visible area the next page starts loading. */
const LIST_PRELOAD_PX = 800;

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflow = getComputedStyle(p).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return p;
  }
  return null;
}

/**
 * Draws a long list a page at a time: [LIST_PAGE] items, then another page whenever [sentinel]
 * (placed after the list) comes within [LIST_PRELOAD_PX] of its scroll container's bottom. Search
 * and counts still run over every item; only the drawing is limited. A new [resetKey] (the query,
 * filter or sort) starts over at one page; a data update keeps what is drawn.
 */
export function useListPages(total: number, resetKey: string): { limit: number; sentinel: ReactNode } {
  const [limit, setLimit] = useState(LIST_PAGE);
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setLimit(LIST_PAGE);
  }
  const [el, setEl] = useState<HTMLElement | null>(null);
  const more = limit < total;
  useEffect(() => {
    if (!el || !more) return;
    // Re-created per page, so a sentinel still in range after a page loads asks for the next one.
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setLimit((n) => n + LIST_PAGE), {
      root: scrollParent(el),
      rootMargin: `0px 0px ${LIST_PRELOAD_PX}px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [el, more, limit]);
  return { limit, sentinel: more ? <div ref={setEl} aria-hidden="true" className="h-px w-full" /> : null };
}

/** Whether [target] has scrolled out of view inside [root] (the list header, on phones). */
export function useScrolledAway(target: React.RefObject<HTMLElement | null>, root: React.RefObject<HTMLElement | null>): boolean {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setGone(!entry.isIntersecting), { root: root.current, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, root]);
  return gone;
}

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 12 }, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] as const } };

/**
 * Top bar start for a searchable list (TopBarTitleSearch): once the header and its search field
 * scroll away, the bar shows the title plus a search button that expands into a search field.
 * Scrolling back to the header or the close button collapses it; the query is kept.
 */
export function TopBarTitleSearch({
  title,
  summary,
  headerGone,
  query,
  onQuery,
  placeholder,
  label,
  titleStyle,
}: {
  title: string;
  summary: string;
  headerGone: boolean;
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  label: string;
  titleStyle?: CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!headerGone) setExpanded(false);
  }, [headerGone]);
  if (expanded) {
    return (
      <motion.div className="flex min-w-0 flex-1 items-center" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}>
        <SearchField value={query} onValue={onQuery} placeholder={placeholder} label={label} height={48} autoFocus className="flex-1" />
        <IconButton icon="close" label="Close search" onClick={() => setExpanded(false)} className="text-on-surface-variant" />
      </motion.div>
    );
  }
  return (
    <>
      <div className="min-w-0 flex-1" style={titleStyle}>
        <AnimatePresence>
          {headerGone && (
            <motion.div {...fade} className="flex min-w-0 flex-col pl-2">
              <span className="truncate text-on-surface t-title-lg">{title}</span>
              <span className="truncate text-on-surface-variant t-body-sm">{summary}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {headerGone && (
          <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.2 }}>
            <IconButton icon="search" label="Search" onClick={() => setExpanded(true)} className="text-on-surface-variant" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Opaque full-width band for a list's sticky filters: rows scroll under it. */
export function PinnedBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('sticky top-0 z-10 w-full bg-surface', className)}>
      <div className="mx-auto w-full max-w-[640px] pb-2">{children}</div>
    </div>
  );
}

/** Centred empty or loading message under a list. */
export function EmptyText({ children }: { children: ReactNode }) {
  return <p className="m-0 px-6 py-12 text-center text-on-surface-variant t-body-md">{children}</p>;
}

/**
 * The card every tablet and web list sits in: surfaceContainerLow, 28dp radius. The cards inside it
 * are one tone up (items-tone), so it reads as a surface and not as a plain background.
 */
export function TabletCard({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={cn('flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-surface-container-low', className)}>
      <div className="items-tone flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

/**
 * Wraps an item of a reflowing list. When the layout changes (a side sheet takes width, the rail
 * toggles, a filter changes) it slides to its new place in order, on the same 300 ms curve as the
 * sheet, instead of jumping or fading.
 */
export function Reflow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div layout="position" transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/** The element's width in px, kept current (the list card narrows as the side sheet or the rail changes). */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
