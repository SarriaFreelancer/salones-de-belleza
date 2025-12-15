'use client';

import * as React from 'react';
import type { Service } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flower2, PlusCircle } from 'lucide-react';
import NewServiceDialog from '@/components/dashboard/new-service-dialog';
import { useServices } from '@/hooks/use-services';

export default function ServicesPage() {
  const { services, addService } = useServices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-2xl">Nuestros Servicios</h1>
        <NewServiceDialog onServiceCreated={addService}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Servicio
          </Button>
        </NewServiceDialog>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {services.map((service) => (
          <Card key={service.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="font-headline text-xl">
                  {service.name}
                </CardTitle>
                <Flower2 className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>{service.duration} min</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">
                {service.description}
              </p>
            </CardContent>
            <CardFooter>
              <div className="text-lg font-semibold text-foreground">
                ${service.price.toFixed(2)}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
