/**
 * Container transform (ContainerTransform.kt): the card or FAB that opens a screen is remembered
 * here at click time, and the screen grows out of its bounds (and shrinks back into it on return).
 * On phones every job, vehicle and part card is a source, as in the Compose app; with a rail only
 * the hero moments are (Needs attention cards and the FAB), per the tablet spec.
 */

export interface ContainerSource {
  rect: DOMRect;
  radius: number;
}

const sources = new Map<string, ContainerSource>();
const elements = new Map<string, HTMLElement>();

export function setContainerSource(key: string, el: HTMLElement | null | undefined) {
  if (!el) return;
  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  sources.set(key, { rect: el.getBoundingClientRect(), radius });
  elements.set(key, el);
}

/** Whether a source is waiting for [key] (without taking it). */
export function hasContainerSource(key: string): boolean {
  return sources.has(key);
}

/** The source for [key] (once): the screen opening now grows out of it. */
export function takeContainerSource(key: string): ContainerSource | null {
  const s = sources.get(key) ?? null;
  sources.delete(key);
  return s;
}

/** Where [key]'s card is now, if it is still on screen, for the return trip. */
export function currentSourceRect(key: string): ContainerSource | null {
  const el = elements.get(key);
  if (!el || !el.isConnected) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return null;
  return { rect, radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 };
}

/** How far the fade-through has to go before the screen is fully opaque (FadeThroughFraction). */
const FADE_THROUGH = 0.35;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface ContainerFrame {
  transform: string;
  clipPath: string;
  opacity: number;
}

/**
 * The screen at [progress] of growing out of [source] (Modifier.containerTransform): scaled to the
 * card's width, moved to its position and clipped to its height and corners at 0, full size at 1.
 * The clip is in the screen's own (unscaled) space, so it is divided by the scale. The screen fades
 * in over the first third, so the card shows through as the container starts to grow.
 */
export function containerFrame(source: ContainerSource, container: DOMRect, progress: number): ContainerFrame {
  const p = Math.min(1, Math.max(0, progress));
  const r = source.rect;
  const scale = lerp(r.width / container.width, 1, p);
  const x = lerp(r.left - container.left, 0, p);
  const y = lerp(r.top - container.top, 0, p);
  const height = Math.min(container.height, lerp(r.height, container.height, p) / scale);
  const corner = lerp(source.radius, 0, p) / scale;
  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    clipPath: `inset(0px 0px ${container.height - height}px 0px round ${corner}px)`,
    opacity: Math.min(1, p / FADE_THROUGH),
  };
}
