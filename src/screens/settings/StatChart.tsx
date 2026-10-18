import { useEffect, useLayoutEffect, useRef } from 'react';
import { epochOf, axisLabel, axisMax, formatMetricWithUnit, isDense, type StatMetric, type StatPeriod } from '../../core/statistics';

/**
 * One bar per day (or per month in All) on a 3-line grid, with a dashed average line and a
 * selection ring (StatChart in StatisticsScreens.kt). Tap a bar to select it; swipe sideways for the
 * [older] or [newer] period. Day bars sit on a shared timeline, so changing period moves a camera:
 * Week zooms into its Month, paging slides old days out and new ones in, and the scale and average
 * glide. To and from All, old bars morph into the new ones by position.
 */

const PLOT_HEIGHT = 176;
const AXIS_GUTTER = 48;
const TOP_INSET = 8;
const AXIS_LABEL_ROOM = 20;
const MORPH_MS = 450;
const SWIPE_COMMIT = 0.25;
const SWIPE_RESISTANCE = 0.2;

interface View {
  start: number;
  days: number;
  max: number;
  avg: number;
  gap: number;
}
interface Layer {
  period: StatPeriod;
  alpha: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpView = (a: View, b: View, t: number): View => ({
  start: lerp(a.start, b.start, t),
  days: lerp(a.days, b.days, t),
  max: lerp(a.max, b.max, t),
  avg: lerp(a.avg, b.avg, t),
  gap: lerp(a.gap, b.gap, t),
});
/** cubic-bezier(0.2, 0, 0, 1), solved numerically. */
function emphasized(x: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2;
    const bx = 3 * (1 - t) * (1 - t) * t * 0.2 + t * t * t;
    if (bx < x) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  return 3 * (1 - t) * t * t + t * t * t;
}

function barIndexOf(p: StatPeriod, day: number): number {
  if (!p.firstDay) return -1;
  const i = day - epochOf(p.firstDay);
  return i >= 0 && i < p.bars.length && !p.bars[i].isFuture ? i : -1;
}

function barGeometry(i: number, n: number, plotW: number, gap: number): [number, number] {
  const slot = plotW / n;
  const w = Math.max(2, slot - gap);
  return [i * slot + (slot - w) / 2, w];
}

function barPath(ctx: CanvasRenderingContext2D, left: number, w: number, h: number, bottom: number) {
  const r = Math.min(w / 2, h);
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, bottom - h + r);
  ctx.arcTo(left, bottom - h, left + r, bottom - h, r);
  ctx.lineTo(left + w - r, bottom - h);
  ctx.arcTo(left + w, bottom - h, left + w, bottom - h + r, r);
  ctx.lineTo(left + w, bottom);
  ctx.closePath();
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function StatChart({
  period,
  older,
  newer,
  metric,
  selected,
  onSelect,
  onPage,
}: {
  period: StatPeriod;
  older: StatPeriod | null;
  newer: StatPeriod | null;
  metric: StatMetric;
  selected: number;
  onSelect: (i: number) => void;
  onPage: (by: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const holder = useRef({
    current: period,
    previous: null as StatPeriod | null,
    fromView: null as View | null,
    fromOldAlpha: 1,
    fromNewAlpha: 0,
    lastView: null as View | null,
    lastLayers: [] as Layer[],
    progress: 1,
    drag: 0,
  });
  const live = useRef({ period, older, newer, metric, selected, onSelect, onPage });
  live.current = { period, older, newer, metric, selected, onSelect, onPage };
  const raf = useRef(0);

  const draw = () => {
    const el = canvas.current;
    if (!el) return;
    const dpr = window.devicePixelRatio || 1;
    const width = el.clientWidth;
    const height = TOP_INSET + PLOT_HEIGHT + AXIS_LABEL_ROOM;
    if (el.width !== Math.round(width * dpr) || el.height !== Math.round(height * dpr)) {
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
    }
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const h = holder.current;
    const { period: p, older: o, newer: n, metric: m, selected: sel } = live.current;
    const t = h.progress;
    const previous = h.previous;
    const top = TOP_INSET;
    const plotH = PLOT_HEIGHT;
    const plotW = width - AXIS_GUTTER;
    const bottom = top + plotH;
    const colors = {
      grid: cssVar('--color-outline-variant'),
      label: cssVar('--color-on-surface-variant'),
      bar: cssVar('--color-primary'),
      ring: cssVar('--color-on-surface'),
    };
    const labelFont = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
    const avgFont = '700 12px "Plus Jakarta Sans", system-ui, sans-serif';

    const viewOf = (q: StatPeriod): View => ({
      start: q.firstDay ? epochOf(q.firstDay) : 0,
      days: q.bars.length,
      max: axisMax(q, m),
      avg: q.average,
      gap: isDense(q) ? 2 : 10,
    });
    const morphing = previous !== null && t < 1;
    const timeline = p.firstDay !== null && (!morphing || previous?.firstDay !== null);
    const target = viewOf(p);
    let view: View;
    let layers: Layer[];
    if (morphing && previous) {
      view = lerpView(h.fromView ?? viewOf(previous), target, t);
      layers = [
        { period: previous, alpha: h.fromOldAlpha * (1 - t) },
        { period: p, alpha: lerp(h.fromNewAlpha, 1, t) },
      ];
    } else {
      const f = timeline && plotW > 0 ? Math.max(-1, Math.min(1, h.drag / plotW)) : 0;
      const neighbour = f > 0 ? o : f < 0 ? n : null;
      if (neighbour) {
        const a = Math.abs(f);
        view = lerpView(target, viewOf(neighbour), a);
        layers = [
          { period: p, alpha: 1 - a },
          { period: neighbour, alpha: a },
        ];
      } else {
        view = { ...target, start: target.start - f * SWIPE_RESISTANCE * target.days };
        layers = [{ period: p, alpha: 1 }];
      }
    }
    h.lastView = view;
    h.lastLayers = layers;
    const grow = previous === null ? t : 1;

    // Grid: top, middle, baseline; each period's axis labels at that period's strength.
    ctx.font = labelFont;
    ctx.textBaseline = 'middle';
    const byMax = new Map<number, number>();
    layers.forEach((l) => byMax.set(axisMax(l.period, m), Math.min(1, (byMax.get(axisMax(l.period, m)) ?? 0) + l.alpha)));
    [1, 0.5, 0].forEach((level) => {
      const y = bottom - plotH * level;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      byMax.forEach((alpha, max) => {
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colors.label;
        ctx.fillText(axisLabel(m, max * level), plotW + 8, y);
      });
    });
    ctx.globalAlpha = 1;

    // Average: the dashed line glides to its new height, behind the bars.
    const avgY = bottom - Math.max(0, Math.min(1, view.avg / view.max)) * plotH * grow;
    ctx.strokeStyle = colors.label;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(0, avgY);
    ctx.lineTo(plotW, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = avgFont;
    ctx.fillStyle = colors.ring;
    ctx.fillText('avg', plotW + 8, avgY);
    ctx.font = labelFont;
    ctx.textBaseline = 'top';

    const fillBar = (left: number, w: number, hgt: number, alpha: number, ring: boolean, ringAlpha = alpha) => {
      barPath(ctx, left, w, hgt, bottom);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors.bar;
      ctx.fill();
      if (ring) {
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = colors.ring;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    if (timeline) {
      const slot = plotW / view.days;
      const w = Math.max(2, slot - view.gap);
      const leftOf = (day: number) => (day - view.start) * slot + (slot - w) / 2;
      const selectedDay = p.firstDay ? epochOf(p.firstDay) + sel : null;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, plotW, height);
      ctx.clip();
      const drawn = new Set<number>();
      layers.forEach((layer) => {
        if (!layer.period.firstDay) return;
        const first = epochOf(layer.period.firstDay);
        layer.period.bars.forEach((bar, i) => {
          const day = first + i;
          if (bar.isFuture || drawn.has(day)) return;
          drawn.add(day);
          let alpha = 0;
          let weighted = 0;
          layers.forEach((l) => {
            const j = barIndexOf(l.period, day);
            if (j >= 0) {
              alpha += l.alpha;
              weighted += l.alpha * l.period.bars[j].value;
            }
          });
          alpha = Math.max(0, Math.min(1, alpha));
          const value = alpha > 0 ? weighted / alpha : bar.value;
          const left = leftOf(day);
          if (alpha <= 0 || left + w < 0 || left > plotW) return;
          const frac = value <= 0 ? 0 : (value / view.max) * grow;
          const hgt = frac <= 0 ? 0 : Math.max(2, frac * plotH);
          if (hgt > 0) fillBar(left, w, hgt, alpha, day === selectedDay);
        });
      });
      layers.forEach((layer) => {
        if (!layer.period.firstDay || layer.alpha <= 0) return;
        const first = epochOf(layer.period.firstDay);
        const dense = isDense(layer.period);
        layer.period.bars.forEach((bar, i) => {
          if (!bar.axis) return;
          const left = leftOf(first + i);
          const tw = ctx.measureText(bar.axis).width;
          const x = dense ? left : left + w / 2 - tw / 2;
          if (x + tw < 0 || x > plotW) return;
          ctx.globalAlpha = layer.alpha;
          ctx.fillStyle = colors.label;
          ctx.fillText(bar.axis, x, bottom + 4);
        });
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      const bars = p.bars;
      const count = bars.length;
      const gapFor = (q: StatPeriod) => (isDense(q) ? 2 : 10);
      const gap = gapFor(p);
      const oldGap = previous ? gapFor(previous) : gap;
      const oldMax = previous ? axisMax(previous, m) : null;
      const tm = morphing ? t : 1;
      bars.forEach((bar, i) => {
        if (bar.isFuture) return;
        const [newLeft, newW] = barGeometry(i, count, plotW, gap);
        let oldLeft = newLeft;
        let oldW = newW;
        let oldValue = 0;
        if (previous && morphing) {
          const on = previous.bars.length;
          const j = Math.max(0, Math.min(on - 1, Math.floor(((i + 0.5) / count) * on)));
          [oldLeft, oldW] = barGeometry(j, on, plotW, oldGap);
          oldValue = previous.bars[j].isFuture ? 0 : previous.bars[j].value;
        }
        const left = lerp(oldLeft, newLeft, tm);
        const w = lerp(oldW, newW, tm);
        const oldFrac = oldMax === null || oldValue <= 0 ? 0 : oldValue / oldMax;
        const newFrac = bar.value <= 0 ? 0 : bar.value / axisMax(p, m);
        const frac = lerp(oldFrac, newFrac, tm) * grow;
        const hgt = frac <= 0 ? 0 : Math.max(2, frac * plotH);
        if (hgt > 0) fillBar(left, w, hgt, 1, i === sel, tm);
      });
      if (previous && morphing) {
        previous.bars.forEach((bar, i) => {
          if (!bar.axis) return;
          const [left, w] = barGeometry(i, previous.bars.length, plotW, oldGap);
          const tw = ctx.measureText(bar.axis).width;
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = colors.label;
          ctx.fillText(bar.axis, isDense(previous) ? left : left + w / 2 - tw / 2, bottom + 4);
        });
      }
      bars.forEach((bar, i) => {
        if (!bar.axis) return;
        const [left, w] = barGeometry(i, count, plotW, gap);
        const tw = ctx.measureText(bar.axis).width;
        ctx.globalAlpha = morphing ? t : 1;
        ctx.fillStyle = colors.label;
        ctx.fillText(bar.axis, isDense(p) ? left : left + w / 2 - tw / 2, bottom + 4);
      });
      ctx.globalAlpha = 1;
    }
  };

  const schedule = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(draw);
  };

  // A new period morphs out of whatever was on screen (mid-swipe included).
  useLayoutEffect(() => {
    const h = holder.current;
    if (h.current !== period) {
      const old = h.current;
      h.fromView = h.lastView;
      h.fromOldAlpha = h.lastLayers.find((l) => l.period === old)?.alpha ?? 1;
      h.fromNewAlpha = h.lastLayers.find((l) => l.period === period)?.alpha ?? 0;
      h.previous = old;
      h.current = period;
    }
    h.drag = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    h.progress = reduced ? 1 : 0;
    let frame = 0;
    const tick = (now: number) => {
      h.progress = reduced ? 1 : emphasized(Math.min(1, (now - start) / MORPH_MS));
      draw();
      if (h.progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [period]);

  useEffect(() => {
    schedule();
  });

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(() => schedule());
    ro.observe(el);
    const mo = new MutationObserver(() => schedule());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  // Tap selects a bar; a horizontal drag pages to the neighbouring period.
  const pointer = useRef<{ x: number; y: number; id: number; moved: boolean; lastX: number; lastT: number; vx: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointer.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, lastX: e.clientX, lastT: performance.now(), vx: 0 };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    if (!p.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - p.y)) {
      p.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (p.moved && live.current.period.firstDay) {
      const now = performance.now();
      p.vx = ((e.clientX - p.lastX) / Math.max(1, now - p.lastT)) * 1000;
      p.lastX = e.clientX;
      p.lastT = now;
      holder.current.drag = dx;
      schedule();
    }
  };
  const settle = () => {
    const h = holder.current;
    const from = h.drag;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 250);
      h.drag = from * (1 - emphasized(t));
      draw();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointer.current;
    pointer.current = null;
    if (!p) return;
    const el = canvas.current;
    if (!el) return;
    const plotW = el.clientWidth - AXIS_GUTTER;
    if (!p.moved) {
      const x = e.clientX - el.getBoundingClientRect().left;
      const bars = live.current.period.bars;
      if (plotW > 0 && x >= 0 && x <= plotW && bars.length > 0) {
        const i = Math.max(0, Math.min(bars.length - 1, Math.floor((x / plotW) * bars.length)));
        if (!bars[i].isFuture) live.current.onSelect(i);
      }
      return;
    }
    const dx = holder.current.drag;
    const target = dx > 0 ? live.current.older : live.current.newer;
    const flung = Math.abs(p.vx) > 600 && Math.sign(p.vx) === Math.sign(dx);
    if (target && (Math.abs(dx) > plotW * SWIPE_COMMIT || flung)) live.current.onPage(dx > 0 ? 1 : -1);
    else settle();
  };

  const bar = period.bars[selected];
  const summary = `Bar chart, ${period.title}. Average ${formatMetricWithUnit(metric, period.average)} per ${period.averageUnit}.` + (bar ? ` Selected ${bar.label}: ${formatMetricWithUnit(metric, bar.value)}.` : '');

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={summary}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' && selected > 0) onSelect(selected - 1);
        if (e.key === 'ArrowRight' && selected < period.bars.length - 1 && !period.bars[selected + 1].isFuture) onSelect(selected + 1);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointer.current = null;
        settle();
      }}
      className="block w-full touch-pan-y"
      style={{ height: TOP_INSET + PLOT_HEIGHT + AXIS_LABEL_ROOM }}
    />
  );
}
