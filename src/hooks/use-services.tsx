'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Service } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';

interface ServicesContextType {
  services: Service[];
  addService: (service: Omit<Service, 'id'>) => void;
  updateService: (updatedService: Service) => void;
  deleteService: (serviceId: string) => void;
  isLoading: boolean;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();

  const servicesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'services');
  }, [firestore]);

  // For admin dashboard, we might need to wait for the user to be authenticated
  // For public pages, we don't. We check the pathname to decide.
  const isDashboard = typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard');
  const { data: services, isLoading } = useCollection<Service>(servicesCollection, isDashboard);


  const addService = (service: Omit<Service, 'id'>) => {
    if (!servicesCollection) return;
    addDocumentNonBlocking(servicesCollection, service);
  };

  const updateService = (updatedService: Service) => {
    if (!firestore) return;
    const serviceDoc = doc(firestore, 'services', updatedService.id);
    setDocumentNonBlocking(serviceDoc, updatedService, { merge: true });
  };

  const deleteService = (serviceId: string) => {
    if (!firestore) return;
    const serviceDoc = doc(firestore, 'services', serviceId);
    deleteDocumentNonBlocking(serviceDoc);
  };

  return (
    <ServicesContext.Provider value={{ services: services || [], addService, updateService, deleteService, isLoading }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};
