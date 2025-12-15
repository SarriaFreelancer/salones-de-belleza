'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { stylists as initialStylists } from '@/lib/data';
import type { Stylist } from '@/lib/types';

interface StylistsContextType {
  stylists: Stylist[];
  addStylist: (stylist: Stylist) => void;
  updateStylist: (updatedStylist: Stylist) => void;
  deleteStylist: (stylistId: string) => void;
}

const StylistsContext = createContext<StylistsContextType | undefined>(undefined);

export const StylistsProvider = ({ children }: { children: ReactNode }) => {
  const [stylists, setStylists] = useState<Stylist[]>(initialStylists);

  const addStylist = (stylist: Stylist) => {
    setStylists((prevStylists) => [...prevStylists, stylist]);
  };

  const updateStylist = (updatedStylist: Stylist) => {
    setStylists((prevStylists) =>
      prevStylists.map((stylist) =>
        stylist.id === updatedStylist.id ? updatedStylist : stylist
      )
    );
  };

  const deleteStylist = (stylistId: string) => {
    setStylists((prevStylists) =>
      prevStylists.filter((stylist) => stylist.id !== stylistId)
    );
  };

  return (
    <StylistsContext.Provider value={{ stylists, addStylist, updateStylist, deleteStylist }}>
      {children}
    </StylistsContext.Provider>
  );
};

export const useStylists = () => {
  const context = useContext(StylistsContext);
  if (context === undefined) {
    throw new Error('useStylists must be used within a StylistsProvider');
  }
  return context;
};
