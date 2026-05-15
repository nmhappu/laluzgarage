import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UIContextType {
  isModalOpen: boolean;
  registerModal: () => () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [modalCount, setModalCount] = useState(0);

  const registerModal = useCallback(() => {
    setModalCount(prev => prev + 1);
    return () => setModalCount(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <UIContext.Provider value={{ isModalOpen: modalCount > 0, registerModal }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
