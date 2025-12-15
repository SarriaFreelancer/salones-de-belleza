'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { galleryImages as initialGalleryImages } from '@/lib/data';
import type { GalleryImage } from '@/lib/types';

interface GalleryContextType {
  galleryImages: GalleryImage[];
  addImage: (image: GalleryImage) => void;
  updateImage: (updatedImage: GalleryImage) => void;
  deleteImage: (imageId: string) => void;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export const GalleryProvider = ({ children }: { children: ReactNode }) => {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(initialGalleryImages);

  const addImage = (image: GalleryImage) => {
    setGalleryImages((prevImages) => [...prevImages, image]);
  };

  const updateImage = (updatedImage: GalleryImage) => {
    setGalleryImages((prevImages) =>
      prevImages.map((image) =>
        image.id === updatedImage.id ? updatedImage : image
      )
    );
  };

  const deleteImage = (imageId: string) => {
    setGalleryImages((prevImages) =>
      prevImages.filter((image) => image.id !== imageId)
    );
  };

  return (
    <GalleryContext.Provider value={{ galleryImages, addImage, updateImage, deleteImage }}>
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
