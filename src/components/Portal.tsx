import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../contexts/UIContext';

interface PortalProps {
  children: ReactNode;
}

export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  const { registerModal } = useUI();

  useEffect(() => {
    setMounted(true);
    const unregister = registerModal();
    return () => {
      setMounted(false);
      unregister();
    };
  }, [registerModal]);

  return mounted 
    ? createPortal(children, document.getElementById('modal-root') as HTMLElement) 
    : null;
}
