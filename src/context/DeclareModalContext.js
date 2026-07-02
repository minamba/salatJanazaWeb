import { createContext, useContext, useState } from 'react';

const DeclareModalContext = createContext(null);

export function DeclareModalProvider({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <DeclareModalContext.Provider value={{
      open,
      openModal: () => setOpen(true),
      closeModal: () => setOpen(false),
    }}>
      {children}
    </DeclareModalContext.Provider>
  );
}

export function useDeclareModal() {
  return useContext(DeclareModalContext);
}
