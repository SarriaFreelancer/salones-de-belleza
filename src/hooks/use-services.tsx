'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { services as initialServices } from '@/lib/data';
import type { Service } from '@/lib/types';

interface ServicesContextType {
  services: Service[];
  addService: (service: Service) => void;
  updateService: (updatedService: Service) => void;
  deleteService: (serviceId: string) => void;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const [services, setServices] = useState<Service[]>(initialServices);

  const addService = (service: Service) => {
    setServices((prevServices) => [...prevServices, service]);
  };

  const updateService = (updatedService: Service) => {
    setServices((prevServices) =>
      prevServices.map((service) =>
        service.id === updatedService.id ? updatedService : service
      )
    );
  };

  const deleteService = (serviceId: string) => {
    setServices((prevServices) =>
      prevServices.filter((service) => service.id !== serviceId)
    );
  };

  return (
    <ServicesContext.Provider value={{ services, addService, updateService, deleteService }}>
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
