'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { GalleryImage } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';


interface GalleryContextType {
  galleryImages: GalleryImage[];
  addImage: (image: Omit<GalleryImage, 'id'>) => void;
  updateImage: (updatedImage: GalleryImage) => void;
  deleteImage: (imageId: string) => void;
  isLoading: boolean;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export const GalleryProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();

  const galleryCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'gallery');
  }, [firestore]);

  const { data: galleryImages, isLoading } = useCollection<GalleryImage>(galleryCollection);

  const addImage = (image: Omit<GalleryImage, 'id'>) => {
    if (!galleryCollection) return;
    addDocumentNonBlocking(galleryCollection, image);
  };

  const updateImage = (updatedImage: GalleryImage) => {
    if (!firestore) return;
    const imageDoc = doc(firestore, 'gallery', updatedImage.id);
    setDocumentNonBlocking(imageDoc, updatedImage, { merge: true });
  };

  const deleteImage = (imageId: string) => {
    if (!firestore) return;
    const imageDoc = doc(firestore, 'gallery', imageId);
    deleteDocumentNonBlocking(imageDoc);
  };

  return (
    <GalleryContext.Provider value={{ galleryImages: galleryImages || [], addImage, updateImage, deleteImage, isLoading }}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
};
