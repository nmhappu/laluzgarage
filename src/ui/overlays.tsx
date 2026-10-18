import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../core/format';
import { DialogTextButton } from './components';

const EMPHASIZED = [0.2, 0, 0, 1] as const;

/** Keeps Tab inside [root] and hands focus back to whatever had it when the overlay closes. */
function useFocusTrap(open: boolean, root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = root.current;
    const focusables = () =>
      el ? [...el.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')] : [];
    const first = focusables()[0];
    (el?.querySelector<HTMLElement>('[data-autofocus]') ?? first ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !el) return;
      const items = focusables();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, root]);
}

/**
 * A modal over a 50% black scrim (DialogScrim in the Compose app). Escape and a scrim click call
 * [onDismiss]. Enters with a short fade and a slight rise along y (no scaling).
 */
export function Modal({
  open,
  onDismiss,
  labelledBy,
  children,
  placement = 'center',
  className,
}: {
  open: boolean;
  onDismiss: () => void;
  labelledBy?: string;
  children: ReactNode;
  placement?: 'center' | 'bottom';
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panel);
  // On tablets (rail layouts) bottom sheets live inside the content area (main), so the nav rail stays put beside them; phones keep the full-window sheet.
  const host = placement === 'bottom' && window.innerWidth >= 600 ? document.querySelector<HTMLElement>('[data-sheet-host]') : null;
  // The rail stays usable beside a tablet sheet: using it (or any route change) closes the sheet.
  const { pathname } = useLocation();
  const firstPath = useRef(pathname);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (open && pathname !== firstPath.current) dismiss.current();
    firstPath.current = pathname;
  }, [pathname, open]);
  useEffect(() => {
    if (!open || !host) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !host.contains(e.target)) dismiss.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, host]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(host ? 'absolute' : 'fixed', 'inset-0 z-50 flex justify-center', placement === 'center' ? 'items-center px-4' : 'items-end')}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onDismiss();
            }
          }}
        >
          <motion.div
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
            aria-hidden="true"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={cn('relative outline-none', className)}
            initial={placement === 'bottom' ? { y: '100%' } : { opacity: 0, y: 16 }}
            animate={placement === 'bottom' ? { y: 0 } : { opacity: 1, y: 0 }}
            exit={placement === 'bottom' ? { y: '100%' } : { opacity: 0, y: 8 }}
            transition={{ duration: placement === 'bottom' ? 0.3 : 0.2, ease: EMPHASIZED }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    host ?? document.body
  );
}

/**
 * Basic dialog from the artboards: surfaceContainerHigh, 28dp radius, 24/12/12/12 padding, 20/28
 * title, 14/20 body, text buttons in 14/20 bold. Dismiss in tertiary; the confirm takes [confirmClass].
 */
export function ConfirmDialog({
  open,
  title,
  body,
  lead,
  confirmText,
  dismissText,
  onConfirm,
  onDismiss,
  confirmClass = 'text-error',
}: {
  open: boolean;
  title: string;
  body: string;
  lead?: ReactNode;
  confirmText: string;
  dismissText: string;
  onConfirm: () => void;
  onDismiss: () => void;
  confirmClass?: string;
}) {
  const titleId = useId();
  return (
    <Modal open={open} onDismiss={onDismiss} labelledBy={titleId} className="w-full max-w-[560px]">
      <div className="flex flex-col gap-2 rounded-2xl bg-surface-container-high px-3 pt-6 pb-3">
        <div className="flex flex-col gap-2 px-3">
          <h2 id={titleId} className="m-0 text-on-surface t-title-lg">
            {title}
          </h2>
          {lead && <div className="pb-1">{lead}</div>}
          <p className="m-0 text-on-surface-variant t-body-md">{body}</p>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <DialogTextButton text={dismissText} onClick={onDismiss} className="text-tertiary" data-autofocus />
          <DialogTextButton text={confirmText} onClick={onConfirm} className={confirmClass} />
        </div>
      </div>
    </Modal>
  );
}

/**
 * Settings confirmation dialog: surfaceContainerHigh, 28dp radius, 24/24/16/24 padding, 16dp gaps,
 * 24/32 title and 16/24 body; Cancel in primary, the destructive action in error.
 */
export function SettingsDialog({ open, title, body, confirmText, onConfirm, onDismiss }: { open: boolean; title: string; body: string; confirmText: string; onConfirm: () => void; onDismiss: () => void }) {
  const titleId = useId();
  return (
    <Modal open={open} onDismiss={onDismiss} labelledBy={titleId} className="w-full max-w-[560px]">
      <div className="flex flex-col gap-4 rounded-2xl bg-surface-container-high px-6 pt-6 pb-4">
        <h2 id={titleId} className="m-0 text-on-surface t-headline-sm">
          {title}
        </h2>
        <p className="m-0 text-on-surface-variant t-body-lg">{body}</p>
        <div className="flex justify-end gap-2 pt-2">
          <DialogTextButton text="Cancel" onClick={onDismiss} className="text-primary" data-autofocus />
          <DialogTextButton text={confirmText} onClick={onConfirm} className="text-error" />
        </div>
      </div>
    </Modal>
  );
}

/** Modal bottom sheet on surfaceContainerLow with a drag handle, capped at the content width. */
export function BottomSheet({ open, onDismiss, title, children }: { open: boolean; onDismiss: () => void; title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <Modal open={open} onDismiss={onDismiss} labelledBy={titleId} placement="bottom" className="w-full max-w-[640px]">
      <div className="flex max-h-[90dvh] flex-col rounded-t-2xl bg-surface-container-low" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-center pt-4 pb-2" aria-hidden="true">
          <span className="h-1 w-8 rounded-full bg-on-surface-variant/40" />
        </div>
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </Modal>
  );
}

/** One-line snackbar on inverseSurface, 4s, polite live region. */
export function Snackbar({ message, onDone, bottom }: { message: string | null; onDone: () => void; bottom: number }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div className="pointer-events-none absolute inset-x-0 z-40 flex justify-center px-4" style={{ bottom }} aria-live="polite">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EMPHASIZED }}
            className="pointer-events-auto flex min-h-12 w-full max-w-[560px] items-center rounded-xs bg-inverse-surface px-4 py-3 text-inverse-on-surface shadow-level3 t-body-md"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
