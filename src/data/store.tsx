import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getDocsFromServer, onSnapshot, type QuerySnapshot } from 'firebase/firestore';
import type { Customer, Part, ServiceRecord, Vehicle } from '../types';
import { ALL_COLLECTIONS, CUSTOMERS, PARTS, SERVICE_RECORDS, VEHICLES, collectionQuery, getWhatsAppPresets, type CollectionName } from './repository';
import { toCustomer, toPart, toServiceRecord, toVehicle } from './convert';
import { DEFAULT_PRESETS, type WhatsAppPresets } from '../core/whatsapp';
import { useAuth } from './auth';

/**
 * The streamed collections and the app-wide sync run (ServiceViewModel + SyncManager in the
 * Compose app). Listeners start once the signed-in member has a role (Firestore rules reject
 * reads before that) and follow the uid.
 */

export type SyncPhase = 'idle' | 'syncing' | 'loading' | 'done' | 'offline';

export interface SyncState {
  phase: SyncPhase;
  /** 0..1 for the progress line under the top bar. */
  progress: number;
}

export const SYNC_LABEL: Record<SyncPhase, string> = {
  syncing: 'Syncing data',
  loading: 'Loading data',
  done: 'All set',
  offline: 'Offline · saved data',
  idle: '',
};

interface DataContextValue {
  records: ServiceRecord[];
  vehicles: Map<string, Vehicle>;
  customers: Map<string, Customer>;
  parts: Part[];
  isLoading: boolean;
  sync: SyncState;
  isOnline: boolean;
  presets: WhatsAppPresets;
  setPresets: (p: WhatsAppPresets) => void;
  /** Pull to refresh: re-reads every collection from the server. */
  refresh: () => void;
  /** One-off result of a save or delete, shown once as a snackbar. */
  message: string | null;
  showMessage: (text: string) => void;
  clearMessage: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

/** Share of the progress line given to the server fetch; the rest is the UI receiving it. */
const FETCH_SHARE = 0.75;
/** Floors per phase so each label is readable even when the cache makes the work instant. */
const MIN_SYNCING_MS = 700;
const MIN_LOADING_MS = 550;
/** How long "All set" / the offline note stays before fading away. */
const HOLD_MS = 1200;
const LOAD_TIMEOUT_MS = 8000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, screen } = useAuth();
  const uid = user?.uid ?? null;
  const active = uid !== null && (screen === 'authenticated' || screen === 'choose-theme');

  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Map<string, Vehicle>>(() => new Map());
  const [customers, setCustomers] = useState<Map<string, Customer>>(() => new Map());
  const [parts, setParts] = useState<Part[]>([]);
  const [loaded, setLoaded] = useState<Set<CollectionName>>(() => new Set());
  const [sync, setSync] = useState<SyncState>({ phase: 'idle', progress: 0 });
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [presets, setPresets] = useState<WhatsAppPresets>(DEFAULT_PRESETS);
  const [message, setMessage] = useState<string | null>(null);

  const delivered = useRef<Set<CollectionName>>(new Set());
  /** Collections whose listener has had a snapshot from the server (not only the local cache). */
  const serverSynced = useRef<Set<CollectionName>>(new Set());
  const running = useRef(false);
  const coldStartDone = useRef<string | null>(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setRecords([]);
      setVehicles(new Map());
      setCustomers(new Map());
      setParts([]);
      setLoaded(new Set());
      return;
    }
    const markLoaded = (name: CollectionName) => {
      delivered.current.add(name);
      setLoaded((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
    };
    serverSynced.current = new Set();
    const onError = (name: string) => (err: unknown) => console.error(`Error streaming ${name}`, err);
    // Metadata changes tell the cold-start sync when the server has answered; a snapshot that only
    // changes metadata (cache → server with the same data, a write acknowledged) leaves the state alone.
    const listen = (name: CollectionName, apply: (s: QuerySnapshot) => void) => {
      let first = true;
      return onSnapshot(
        collectionQuery(name),
        { includeMetadataChanges: true },
        (s) => {
          if (first || s.docChanges().length > 0) apply(s);
          first = false;
          markLoaded(name);
          if (!s.metadata.fromCache) serverSynced.current.add(name);
        },
        onError(name)
      );
    };
    const unsubs = [
      listen(SERVICE_RECORDS, (s) => setRecords(s.docs.map(toServiceRecord))),
      listen(VEHICLES, (s) => setVehicles(new Map(s.docs.map((d) => [d.id, toVehicle(d)])))),
      listen(CUSTOMERS, (s) => setCustomers(new Map(s.docs.map((d) => [d.id, toCustomer(d)])))),
      listen(PARTS, (s) => setParts(s.docs.map(toPart))),
    ];
    void getWhatsAppPresets().then(setPresets);
    return () => unsubs.forEach((u) => u());
  }, [active, uid]);

  /**
   * [refetch]: pull to refresh re-reads every collection from the server. The cold start doesn't:
   * the listeners already ask the server, so it waits for each one's first server snapshot.
   */
  const runSync = useCallback(async (refetch: boolean) => {
    if (running.current) return;
    running.current = true;
    try {
      if (refetch) delivered.current = new Set();
      setSync({ phase: 'syncing', progress: 0 });
      const syncStart = Date.now();
      let results: boolean[];
      if (refetch) {
        let fetched = 0;
        results = await Promise.all(
          ALL_COLLECTIONS.map(async (name) => {
            let ok = true;
            try {
              await getDocsFromServer(collectionQuery(name));
            } catch {
              ok = false;
            }
            fetched++;
            setSync((s) => ({ ...s, progress: (FETCH_SHARE * fetched) / ALL_COLLECTIONS.length }));
            return ok;
          })
        );
      } else {
        let synced = 0;
        while (Date.now() - syncStart < LOAD_TIMEOUT_MS && navigator.onLine) {
          const now = ALL_COLLECTIONS.filter((n) => serverSynced.current.has(n)).length;
          if (now !== synced) {
            synced = now;
            setSync((s) => ({ ...s, progress: (FETCH_SHARE * now) / ALL_COLLECTIONS.length }));
          }
          if (now === ALL_COLLECTIONS.length) break;
          await sleep(100);
        }
        results = ALL_COLLECTIONS.map((n) => serverSynced.current.has(n));
      }
      await sleep(MIN_SYNCING_MS - (Date.now() - syncStart));
      if (results.some((ok) => !ok)) {
        setSync({ phase: 'offline', progress: 1 });
      } else {
        setSync({ phase: 'loading', progress: FETCH_SHARE });
        const loadStart = Date.now();
        while (Date.now() - loadStart < LOAD_TIMEOUT_MS && !ALL_COLLECTIONS.every((n) => delivered.current.has(n))) {
          await sleep(100);
        }
        setSync((s) => ({ ...s, progress: 1 }));
        await sleep(MIN_LOADING_MS - (Date.now() - loadStart));
        setSync({ phase: 'done', progress: 1 });
      }
      await sleep(HOLD_MS);
      setSync({ phase: 'idle', progress: 0 });
    } finally {
      running.current = false;
    }
  }, []);

  // Cold-start sync, once per signed-in account per page load, when the app UI first shows.
  useEffect(() => {
    if (screen === 'authenticated' && uid && coldStartDone.current !== uid) {
      coldStartDone.current = uid;
      void runSync(false);
    }
  }, [screen, uid, runSync]);

  const refresh = useCallback(() => {
    if (uid) void runSync(true);
  }, [uid, runSync]);

  const showMessage = useCallback((text: string) => setMessage(text), []);
  const clearMessage = useCallback(() => setMessage(null), []);

  const isLoading = ALL_COLLECTIONS.some((n) => !loaded.has(n));

  const value = useMemo(
    () => ({ records, vehicles, customers, parts, isLoading, sync, isOnline, presets, setPresets, refresh, message, showMessage, clearMessage }),
    [records, vehicles, customers, parts, isLoading, sync, isOnline, presets, refresh, message, showMessage, clearMessage]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
