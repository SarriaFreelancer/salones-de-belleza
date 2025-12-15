'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { services as initialServices } from '@/lib/data';
import type { Service } from '@/lib/types';

interface ServicesContextType {
  services: Service[];
  addService: (service: Service) => void;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const [services, setServices] = useState<Service[]>(initialServices);

  const addService = (service: Service) => {
    setServices((prevServices) => [...prevServices, service]);
  };

  return (
    <ServicesContext.Provider value={{ services, addService }}>
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
