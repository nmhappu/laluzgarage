import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, usePresence, usePresenceData, useTransform } from 'motion/react';
import { Navigate, Route, Routes, useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAuth } from '../data/auth';
import { useData } from '../data/store';
import { getUserRole } from '../types';
import { Snackbar } from '../ui/overlays';
import { containerFrame, currentSourceRect, hasContainerSource, takeContainerSource, type ContainerSource } from './containerTransform';
import { prefersReducedMotion, useLayout, type Layout } from './layout';
import { DESTINATIONS, FloatingNavToolbar, NavRail, type Destination, type TabKey } from './nav';
import { ShellContext, useBack, type ShellContextValue } from './shellContext';
import { useOpeners } from './openers';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ServicesScreen } from '../screens/services/ServicesScreen';
import { JobCardScreen } from '../screens/services/JobCardScreen';
import { JobEditScreen } from '../screens/services/JobEditScreen';
import { VehiclesScreen } from '../screens/vehicles/VehiclesScreen';
import { VehicleDetailScreen } from '../screens/vehicles/VehicleDetailScreen';
import { InventoryScreen } from '../screens/inventory/InventoryScreen';
import { PartDetailScreen } from '../screens/inventory/PartDetailScreen';
import { PartFormSheet } from '../screens/inventory/PartFormSheet';
import { IntakeScreen } from '../screens/intake/IntakeScreen';
import { SettingsChildRoute, SettingsHome, SettingsSectionRoute } from '../screens/settings/SettingsScreens';

const EMPHASIZED = [0.2, 0, 0, 1] as const;
const MOTION_S = 0.3;

// ---------------------------------------------------------------------------
// Where a path sits: a tab, or a layer over the tabs (AppLayer in LaluzApp.kt)
// ---------------------------------------------------------------------------

interface LayerInfo {
  /** Identity for transitions; a new key animates in. */
  key: string;
  /** Stacking order: a deeper layer slides in over a shallower one. */
  depth: number;
  /** Rises as a full-height sheet (the intake) instead of sliding in. */
  sheet: boolean;
  /** Container transform source key. */
  source: string | null;
  /** The tab shown under it when the app opened straight onto it. */
  home: TabKey;
}

interface Placement {
  tab: TabKey | null;
  layer: LayerInfo | null;
}

const SETTINGS_SECTIONS = new Set(['team', 'theme', 'statistics']);

function place(pathname: string, layout: Layout): Placement | 'unknown' {
  const seg = pathname.split('/').filter(Boolean);
  const layer = (key: string, depth: number, home: TabKey, opts: Partial<LayerInfo> = {}): Placement => ({
    tab: null,
    layer: { key, depth, sheet: false, source: null, home, ...opts },
  });
  if (seg.length === 0) return { tab: 'dashboard', layer: null };
  const [a, b, c] = seg;
  switch (a) {
    case 'vehicles':
      if (!b) return { tab: 'vehicles', layer: null };
      return seg.length === 2 ? layer(`vehicle:${b}`, 2, 'vehicles', { source: `vehicle:${b}` }) : 'unknown';
    case 'inventory':
      if (!b) return { tab: 'inventory', layer: null };
      return seg.length === 2 ? layer(`part:${b}`, 3, 'inventory', { source: `part:${b}` }) : 'unknown';
    case 'services':
      return seg.length === 1 ? { tab: 'services', layer: null } : 'unknown';
    case 'jobs':
      if (!b) return 'unknown';
      if (c === 'edit' && seg.length === 3) return layer(`job-edit:${b}`, 5, 'services');
      return seg.length === 2 ? layer(`job:${b}`, 4, 'services', { source: `job:${b}` }) : 'unknown';
    case 'intake':
      return seg.length === 1 ? layer('intake', 6, 'dashboard', { sheet: true, source: 'intake' }) : 'unknown';
    case 'settings': {
      if (b && !SETTINGS_SECTIONS.has(b)) return 'unknown';
      if (c && !(b === 'team' || b === 'statistics')) return 'unknown';
      if (seg.length > 3) return 'unknown';
      // Settings opens from the avatar. Two panes keep every page inside one layer; otherwise pages slide over it.
      if (layout.twoPane || !b) return layer('settings', 1, 'dashboard');
      return layer(`settings/${seg.slice(1).join('/')}`, c ? 1.7 : 1.5, 'dashboard');
    }
    default:
      return 'unknown';
  }
}

/** Every routed screen; tabs and layers both render through this so useParams works. */
function ScreenRoutes({ location, active }: { location: Location; active: boolean }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<DashboardScreen active={active} />} />
      <Route path="/vehicles" element={<VehiclesScreen active={active} />} />
      <Route path="/vehicles/:vehicleId" element={<VehicleDetailScreen />} />
      <Route path="/inventory" element={<InventoryScreen active={active} />} />
      <Route path="/inventory/:partId" element={<PartDetailScreen />} />
      <Route path="/services" element={<ServicesScreen active={active} />} />
      <Route path="/jobs/:recordId" element={<JobCardScreen />} />
      <Route path="/jobs/:recordId/edit" element={<JobEditScreen />} />
      <Route path="/intake" element={<IntakeScreen />} />
      <Route path="/settings" element={<SettingsHome />} />
      <Route path="/settings/team" element={<SettingsSectionRoute section="team" />} />
      <Route path="/settings/team/:uid" element={<SettingsChildRoute kind="member" />} />
      <Route path="/settings/theme" element={<SettingsSectionRoute section="theme" />} />
      <Route path="/settings/statistics" element={<SettingsSectionRoute section="statistics" />} />
      <Route path="/settings/statistics/:metric" element={<SettingsChildRoute kind="statistic" />} />
    </Routes>
  );
}

const TAB_PATH: Record<TabKey, string> = { dashboard: '/', vehicles: '/vehicles', inventory: '/inventory', services: '/services', settings: '/settings' };
const TAB_ORDER: TabKey[] = ['dashboard', 'vehicles', 'inventory', 'services'];

const fakeLocations = new Map<string, Location>();
/** A stable stand-in location per tab path, so the memoized tab keeps its props. */
function fakeLocation(pathname: string): Location {
  let loc = fakeLocations.get(pathname);
  if (!loc) {
    loc = { pathname, search: '', hash: '', state: null, key: `tab:${pathname}` };
    fakeLocations.set(pathname, loc);
  }
  return loc;
}

/** Direction of the last tab switch: 1 rightward, -1 leftward. */
let lastTabDir = 1;

// ---------------------------------------------------------------------------
// Tabs: visited tabs stay mounted, so switching never rebuilds a screen or loses its scroll.
// Memoized: a shell render (snackbar, toolbar, parts) leaves the tabs alone.
// ---------------------------------------------------------------------------

const TabPane = memo(function TabPane({ tab, active, location, layout, covered }: { tab: TabKey; active: boolean; location: Location; layout: Layout; covered: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<boolean>(active);
  useLayoutEffect(() => {
    if (active && !prev.current && ref.current && !prefersReducedMotion()) {
      // Phones: shared axis X (10% slide, fade through). Rail: top level fades out then in.
      const from = layout.isCompact ? [{ opacity: 0, transform: `translateX(${lastTabDir * 10}%)` }, { opacity: 1, transform: 'none' }] : [{ opacity: 0 }, { opacity: 1 }];
      ref.current.animate(from, { duration: layout.isCompact ? MOTION_S * 1000 : 210, delay: layout.isCompact ? 0 : 90, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' });
    }
    prev.current = active;
  }, [active, layout.isCompact]);
  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{ visibility: active ? 'visible' : 'hidden', zIndex: active ? 1 : 0 }}
      inert={!active || covered}
      aria-hidden={!active || covered}
      data-tab={tab}
    >
      <ScreenRoutes location={location} active={active && !covered} />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Layers: detail screens over the tabs
// ---------------------------------------------------------------------------

interface LayerCustom {
  forward: boolean;
  reduced: boolean;
  /** The layer coming in grows out of a card, so the one it covers holds still. */
  grows: boolean;
}

/** What a leaving layer does: shrink into its card, hold still under a growing one, or slide. */
type ExitPlan = { kind: 'shrink'; source: ContainerSource; box: DOMRect } | { kind: 'hold' } | { kind: 'slide' };

function LayerView({ info, location, contentRef, custom }: { info: LayerInfo; location: Location; contentRef: React.RefObject<HTMLDivElement | null>; custom: LayerCustom }) {
  // The card or FAB this layer grows out of, if it was tapped just now.
  const [grow] = useState(() => {
    const source = info.source ? takeContainerSource(info.source) : null;
    const box = contentRef.current?.getBoundingClientRect();
    return source && box && !custom.reduced ? { source, box } : null;
  });
  // Container transform progress: 0 is the card, 1 the full screen.
  const progress = useMotionValue(grow ? 0 : 1);
  const frame = useRef<{ source: ContainerSource; box: DOMRect } | null>(grow);
  const transform = useTransform(progress, (p) => (frame.current && p < 1 ? containerFrame(frame.current.source, frame.current.box, p).transform : 'none'));
  const clipPath = useTransform(progress, (p) => (frame.current && p < 1 ? containerFrame(frame.current.source, frame.current.box, p).clipPath : 'none'));
  const opacity = useTransform(progress, (p) => (frame.current && p < 1 ? containerFrame(frame.current.source, frame.current.box, p).opacity : 1));

  useEffect(() => {
    if (!grow) return;
    const controls = animate(progress, 1, { duration: MOTION_S, ease: EMPHASIZED });
    return () => controls.stop();
  }, [grow, progress]);

  // Decided once, when the layer starts leaving; read by both the exit variant and the effect below.
  const plan = useRef<ExitPlan | null>(null);
  const exitPlan = (c: LayerCustom): ExitPlan => {
    if (plan.current) return plan.current;
    let next: ExitPlan = { kind: 'slide' };
    if (!c.reduced && c.forward && c.grows) next = { kind: 'hold' };
    else if (!c.reduced && !c.forward && grow && info.source) {
      // Shrink back into the card when it is still on screen.
      const source = currentSourceRect(info.source);
      const box = contentRef.current?.getBoundingClientRect();
      if (source && box) next = { kind: 'shrink', source, box };
    }
    plan.current = next;
    return next;
  };

  const [isPresent, safeToRemove] = usePresence();
  const leaving = usePresenceData() as LayerCustom | undefined;
  useEffect(() => {
    if (isPresent) return;
    const next = exitPlan(leaving ?? custom);
    if (next.kind === 'shrink') {
      frame.current = { source: next.source, box: next.box };
      const controls = animate(progress, 0, { duration: 0.25, ease: EMPHASIZED, onComplete: safeToRemove });
      return () => controls.stop();
    }
    // Keep drawing under the screen that grows over this one, then go.
    const timer = window.setTimeout(safeToRemove, next.kind === 'hold' ? MOTION_S * 1000 : 0);
    return () => window.clearTimeout(timer);
  }, [isPresent]);

  const variants = {
    enter: (c: LayerCustom) => {
      if (c.reduced) return { opacity: 0, zIndex: c.forward ? 2 : 1 };
      if (grow) return { zIndex: 2 };
      if (info.sheet) return c.forward ? { y: '100%', zIndex: 2 } : { zIndex: 1 };
      return { x: c.forward ? '100%' : '-25%', zIndex: c.forward ? 2 : 1 };
    },
    center: { x: 0, y: 0, opacity: 1 },
    exit: (c: LayerCustom) => {
      if (c.reduced) return { opacity: 0, zIndex: c.forward ? 1 : 2, transition: { duration: 0.12 } };
      const next = exitPlan(c);
      if (next.kind === 'shrink') return { zIndex: 2 };
      if (next.kind === 'hold') return { zIndex: 1 };
      if (info.sheet) return c.forward ? { zIndex: 1 } : { y: '100%', zIndex: 2 };
      return { x: c.forward ? '-25%' : '100%', zIndex: c.forward ? 1 : 2 };
    },
  };
  return (
    <motion.div
      custom={custom}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: MOTION_S, ease: EMPHASIZED }}
      className="absolute inset-0"
      data-layer={info.key}
    >
      <motion.div className="absolute inset-0 bg-surface" style={{ transform, transformOrigin: '0 0', clipPath, opacity }}>
        <ScreenRoutes location={location} active />
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const layout = useLayout();
  const { profile, user } = useAuth();
  const { message, clearMessage } = useData();
  const { openIntake } = useOpeners();
  const placement = place(location.pathname, layout);

  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const [addingPart, setAddingPart] = useState(false);
  const [lastTab, setLastTab] = useState<TabKey>(() => (placement !== 'unknown' ? placement.tab ?? placement.layer?.home ?? 'dashboard' : 'dashboard'));
  const tabLocations = useRef<Partial<Record<TabKey, Location>>>({});
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set([lastTab]));
  const prevDepth = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentTab: TabKey = placement !== 'unknown' && placement.tab ? placement.tab : lastTab;
  const layer = placement !== 'unknown' ? placement.layer : null;
  // The rail's menu button collapses and expands it; large windows start expanded.
  const [railOpen, setRailOpen] = useState(layout.railExpanded);

  useEffect(() => {
    if (placement === 'unknown') return;
    if (placement.tab) {
      tabLocations.current[placement.tab] = location;
      if (placement.tab !== lastTab) {
        lastTabDir = TAB_ORDER.indexOf(placement.tab) >= TAB_ORDER.indexOf(lastTab) ? 1 : -1;
        setLastTab(placement.tab);
      }
      setVisited((v) => (v.has(placement.tab!) ? v : new Set(v).add(placement.tab!)));
    }
  });

  // Coming back to the tabs (from a job card or the intake) always shows the toolbar.
  useEffect(() => {
    if (!layer) setToolbarExpanded(true);
  }, [layer]);

  const layerKey = layer?.key ?? null;
  const layerSource = layer?.source ?? null;
  // Checked once per layer (the key), before the layer takes the source.
  const layerGrows = useMemo(() => (layerSource ? hasContainerSource(layerSource) : false), [layerKey, layerSource]);
  const depth = layer?.depth ?? 0;
  const forward = depth > prevDepth.current;
  useEffect(() => {
    prevDepth.current = depth;
  }, [depth]);
  const reduced = prefersReducedMotion();

  const name = profile?.name?.trim() || user?.displayName || user?.email?.split('@')[0] || 'Operator';
  const account = useMemo(
    () => ({
      name,
      photoUrl: profile?.photoURL || user?.photoURL || null,
      isAdmin: getUserRole(profile) === 'admin',
      onOpenSettings: () => navigate('/settings'),
    }),
    [name, profile, user, navigate]
  );

  const shell: ShellContextValue = useMemo(
    () => ({ account, setToolbarExpanded, openAddPart: () => setAddingPart(true) }),
    [account]
  );

  const onSelect = useCallback(
    (d: Destination) => {
      const target = d.key === currentTab && !layer ? d.path : tabLocations.current[d.key]?.pathname ?? d.path;
      setToolbarExpanded(true);
      (document.activeElement as HTMLElement | null)?.blur?.();
      navigate(d.key === currentTab ? d.path : target);
    },
    [currentTab, layer, navigate]
  );

  const closeSheet = useBack(TAB_PATH[layer?.home ?? 'dashboard']);
  const onInventory = currentTab === 'inventory' && !layer;
  const fabLabel = onInventory ? 'Create part' : 'New intake';
  const onFab = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onInventory) setAddingPart(true);
    else openIntake(e.currentTarget);
  };


  if (placement === 'unknown') return <Navigate to="/" replace />;

  const snackbarBottom = layer
    ? layer.key.startsWith('job:')
      ? 180
      : 96
    : layout.isCompact
      ? 104
      : 24;

  const sideSheet = isSheetLayer(layer, layout);
  const coplanar = layout.windowClass === 'large';
  // The page's top bar: 64dp on the dashboard, the 96dp tablet bar on the list tabs.
  const sheetTop = currentTab === 'dashboard' ? 64 : 96;
  const tabsCovered = layer !== null && !sideSheet;
  // Sheets rise over still tabs and a card grows in place: only a slide pushes the tabs back.
  const tabsShifted = tabsCovered && layout.isCompact && !layer.sheet && !reduced && !layerGrows;

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex h-full w-full overflow-hidden bg-surface">
        {layout.hasRail && <NavRail current={currentTab} onSelect={onSelect} expanded={railOpen} onToggle={() => setRailOpen((v) => !v)} fabLabel={fabLabel} onFab={onFab} />}
        <main ref={contentRef} data-sheet-host className="relative min-w-0 flex-1 overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', ['--sheet-inset' as string]: sideSheet && coplanar ? `${SIDE_SHEET_WIDTH + SHEET_GUTTER}px` : '0px' }}>
          <motion.div className="absolute inset-0" initial={false} animate={{ x: tabsShifted ? '-25%' : 0 }} transition={{ duration: MOTION_S, ease: EMPHASIZED }}>
            {DESTINATIONS.map((d) => d.key).map((tab) =>
              visited.has(tab) || tab === currentTab ? (
                <TabPane
                  key={tab}
                  tab={tab}
                  active={tab === currentTab}
                  covered={tabsCovered}
                  layout={layout}
                  location={tab === currentTab && !layer ? location : tabLocations.current[tab] ?? fakeLocation(TAB_PATH[tab])}
                />
              ) : null
            )}
          </motion.div>
          <AnimatePresence initial={false} custom={{ forward, reduced, grows: layerGrows } satisfies LayerCustom}>
            {layer && !sideSheet && <LayerHost key={layer.key} info={layer} location={location} contentRef={contentRef} custom={{ forward, reduced, grows: layerGrows }} />}
          </AnimatePresence>
          <AnimatePresence>
            {sideSheet && layer && <SideSheet key="sheet" info={layer} location={location} top={sheetTop} modal={!coplanar} onDismiss={closeSheet} />}
          </AnimatePresence>
          {layout.isCompact && !layer && (
            <FloatingNavToolbar current={currentTab} onSelect={onSelect} fabLabel={fabLabel} onFab={onFab} expanded={toolbarExpanded} />
          )}
          <Snackbar message={message} onDone={clearMessage} bottom={snackbarBottom} />
        </main>
      </div>
      <PartFormSheet open={addingPart} part={null} onDismiss={() => setAddingPart(false)} />
    </ShellContext.Provider>
  );
}

const SIDE_SHEET_WIDTH = 400;
const SHEET_GUTTER = 24;

/** Jobs, parts and vehicles open in the side sheet on tablets; everything else is a full layer. */
function isSheetLayer(layer: LayerInfo | null, layout: Layout): boolean {
  return layout.hasRail && layer !== null && /^(job|part|vehicle):/.test(layer.key);
}

/**
 * Tablet detail sheet, under the page's top bar and beside the content. Large windows share the
 * screen (the page gives up the width via --sheet-inset); smaller ones lay it over a 32% scrim.
 */
function SideSheet({ info, location, top, modal, onDismiss }: { info: LayerInfo; location: Location; top: number; modal: boolean; onDismiss: () => void }) {
  const reduced = prefersReducedMotion();
  useEffect(() => {
    // Nothing grows out of a card here; drop the source so it isn't left waiting.
    if (info.source) takeContainerSource(info.source);
  }, [info.key]);
  const t = { duration: reduced ? 0 : MOTION_S, ease: EMPHASIZED };
  return (
    <>
      {modal && (
        <motion.div
          className="absolute inset-0 z-20 bg-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.32 }}
          exit={{ opacity: 0 }}
          transition={t}
          onClick={onDismiss}
          aria-hidden="true"
        />
      )}
      <motion.aside
        aria-label="Details"
        className="raised-src absolute z-30 overflow-hidden rounded-[28px] bg-surface-container-low"
        style={{ top: `calc(env(safe-area-inset-top) + ${modal ? SHEET_GUTTER : top}px)`, right: SHEET_GUTTER, bottom: SHEET_GUTTER, width: SIDE_SHEET_WIDTH }}
        initial={{ x: SIDE_SHEET_WIDTH + SHEET_GUTTER }}
        animate={{ x: 0 }}
        exit={{ x: SIDE_SHEET_WIDTH + SHEET_GUTTER }}
        transition={t}
      >
        <div className="raised-in absolute inset-0 bg-surface">
          <ScreenRoutes key={info.key} location={location} active />
        </div>
      </motion.aside>
    </>
  );
}

/** Freezes the location a layer was opened with, so a leaving layer keeps drawing its own screen. */
function LayerHost({ info, location, contentRef, custom }: { info: LayerInfo; location: Location; contentRef: React.RefObject<HTMLDivElement | null>; custom: LayerCustom }) {
  const [frozen] = useState(location);
  const shown = location.pathname === frozen.pathname ? location : frozen;
  return <LayerView info={info} location={shown} contentRef={contentRef} custom={custom} />;
}
