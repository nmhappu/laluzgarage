import { useEffect, ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../contexts/UIContext';

interface PortalProps {
  children: ReactNode;
}

export function Portal({ children }: PortalProps) {
  const { registerModal } = useUI();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unregister = registerModal();
    return () => {
      unregister();
    };
  }, [registerModal]);

  if (!mounted) return null;

  const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
  if (!modalRoot) return null;

  return createPortal(children, modalRoot);
}

