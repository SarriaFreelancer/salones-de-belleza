'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Stylist } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';

interface StylistsContextType {
  stylists: Stylist[];
  addStylist: (stylist: Omit<Stylist, 'id'>) => void;
  updateStylist: (updatedStylist: Stylist) => void;
  deleteStylist: (stylistId: string) => void;
  isLoading: boolean;
}

const StylistsContext = createContext<StylistsContextType | undefined>(undefined);

export const StylistsProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();
  
  const stylistsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'stylists');
  }, [firestore]);
  
  const { data: stylists, isLoading } = useCollection<Stylist>(stylistsCollection);

  const addStylist = (stylist: Omit<Stylist, 'id'>) => {
    if (!stylistsCollection) return;
    addDocumentNonBlocking(stylistsCollection, stylist);
  };

  const updateStylist = (updatedStylist: Stylist) => {
    if (!firestore) return;
    const stylistDoc = doc(firestore, 'stylists', updatedStylist.id);
    setDocumentNonBlocking(stylistDoc, updatedStylist, { merge: true });
  };

  const deleteStylist = (stylistId: string) => {
     if (!firestore) return;
    const stylistDoc = doc(firestore, 'stylists', stylistId);
    deleteDocumentNonBlocking(stylistDoc);
  };

  return (
    <StylistsContext.Provider value={{ stylists: stylists || [], addStylist, updateStylist, deleteStylist, isLoading }}>
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
