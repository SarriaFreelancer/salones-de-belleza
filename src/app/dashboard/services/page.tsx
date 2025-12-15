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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Flower2, MoreVertical, PlusCircle, Edit, Trash2 } from 'lucide-react';
import NewServiceDialog from '@/components/dashboard/new-service-dialog';
import { useServices } from '@/hooks/use-services';
import { useToast } from '@/hooks/use-toast';

export default function ServicesPage() {
  const { services, addService, updateService, deleteService } = useServices();
  const [editingService, setEditingService] = React.useState<Service | null>(null);
  const [isNewServiceDialogOpen, setIsNewServiceDialogOpen] = React.useState(false);
  const [serviceToDelete, setServiceToDelete] = React.useState<Service | null>(null);
  const { toast } = useToast();

  const handleServiceCreated = (service: Service) => {
    addService(service);
    setIsNewServiceDialogOpen(false);
  };

  const handleServiceUpdated = (service: Service) => {
    updateService(service);
    setEditingService(null);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
  };

  const confirmDelete = () => {
    if (serviceToDelete) {
      deleteService(serviceToDelete.id);
      toast({
        title: 'Servicio Eliminado',
        description: `El servicio "${serviceToDelete.name}" ha sido eliminado.`,
      });
      setServiceToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-headline text-2xl">Nuestros Servicios</h1>
          <NewServiceDialog
            open={isNewServiceDialogOpen}
            onOpenChange={setIsNewServiceDialogOpen}
            onServiceCreated={handleServiceCreated}
          >
            <Button onClick={() => setIsNewServiceDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Servicio
            </Button>
          </NewServiceDialog>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((service) => (
            <Card key={service.id} className="flex flex-col relative">
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(service)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(service)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Eliminar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="font-headline text-xl pr-8">
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
      
      {editingService && (
        <NewServiceDialog
          open={!!editingService}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingService(null);
            }
          }}
          serviceToEdit={editingService}
          onServiceCreated={handleServiceUpdated}
        />
      )}

      <AlertDialog open={!!serviceToDelete} onOpenChange={(isOpen) => !isOpen && setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el servicio
              "{serviceToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServiceToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
