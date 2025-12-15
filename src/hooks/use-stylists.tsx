'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Stylist } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface StylistsContextType {
  stylists: Stylist[];
  addStylist: (stylist: Omit<Stylist, 'id' | 'avatarUrl' | 'availability'>) => void;
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

  const addStylist = (stylist: Omit<Stylist, 'id' | 'avatarUrl' | 'availability'>) => {
    if (!stylistsCollection) return;
    const currentStylistCount = stylists?.length || 0;
    const avatarUrl = PlaceHolderImages[currentStylistCount % PlaceHolderImages.length]?.imageUrl || `https://picsum.photos/seed/stylist${currentStylistCount}/100/100`;

    const newStylist: Omit<Stylist, 'id'> = {
      ...stylist,
      avatarUrl,
      availability: {},
    };
    addDocumentNonBlocking(stylistsCollection, newStylist);
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
