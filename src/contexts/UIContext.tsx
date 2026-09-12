import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
} from 'react';

export type BackHandlerFn = () => boolean | void;

export interface BackHandlerOptions {
  priority?: number;
  isModal?: boolean;
}

interface BackHandlerEntry {
  id: number;
  handler: BackHandlerFn;
  priority: number;
  isModal?: boolean;
}

interface UIContextType {
  isModalOpen: boolean;
  registerModal: () => () => void;
  registerBackHandler: (
    handler: BackHandlerFn,
    options?: number | BackHandlerOptions
  ) => () => void;
  executeBackAction: () => boolean;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

let nextHandlerId = 1;

export function UIProvider({ children }: { children: ReactNode }) {
  const [modalCount, setModalCount] = useState(0);
  const handlersRef = useRef<BackHandlerEntry[]>([]);

  const registerModal = useCallback(() => {
    setModalCount((prev) => prev + 1);
    return () => setModalCount((prev) => Math.max(0, prev - 1));
  }, []);

  const registerBackHandler = useCallback(
    (handler: BackHandlerFn, options?: number | BackHandlerOptions) => {
      const priority =
        typeof options === 'number' ? options : options?.priority ?? 0;
      const isModal = typeof options === 'object' ? Boolean(options.isModal) : false;
      const id = nextHandlerId++;

      const entry: BackHandlerEntry = { id, handler, priority, isModal };
      handlersRef.current.push(entry);

      if (isModal) {
        setModalCount((prev) => prev + 1);
      }

      return () => {
        handlersRef.current = handlersRef.current.filter((h) => h.id !== id);
        if (isModal) {
          setModalCount((prev) => Math.max(0, prev - 1));
        }
      };
    },
    []
  );

  const executeBackAction = useCallback((): boolean => {
    const list = [...handlersRef.current];
    if (list.length === 0) {
      // Fallback: check legacy window listeners
      const customEvent = new CustomEvent('appBackButton', { cancelable: true });
      const handledByLegacy = !window.dispatchEvent(customEvent);
      return handledByLegacy;
    }

    // Sort by priority DESC, then by id DESC (LIFO: newest first)
    list.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.id - a.id;
    });

    for (const item of list) {
      try {
        const result = item.handler();
        // If handler didn't explicitly return false, consider it consumed
        if (result !== false) {
          return true;
        }
      } catch (err) {
        console.error('Error executing back handler:', err);
      }
    }

    // If none consumed, try legacy event
    const customEvent = new CustomEvent('appBackButton', { cancelable: true });
    return !window.dispatchEvent(customEvent);
  }, []);

  const value = useMemo(
    () => ({
      isModalOpen: modalCount > 0,
      registerModal,
      registerBackHandler,
      executeBackAction,
    }),
    [modalCount, registerModal, registerBackHandler, executeBackAction]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

/**
 * Convenient hook to register a back action handler.
 * Automatically manages active state and handler freshness.
 */
export function useBackHandler(
  handler: BackHandlerFn,
  enabled: boolean = true,
  options?: number | BackHandlerOptions
) {
  const { registerBackHandler } = useUI();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const cleanup = registerBackHandler(() => handlerRef.current(), options);
    return cleanup;
  }, [enabled, registerBackHandler, typeof options === 'number' ? options : JSON.stringify(options)]);
}
