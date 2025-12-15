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

type DialogState = 
  | { type: 'new' }
  | { type: 'edit'; service: Service }
  | { type: 'delete'; service: Service }
  | null;


export default function ServicesPage() {
  const { services, addService, updateService, deleteService } = useServices();
  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  const { toast } = useToast();

  const handleAddService = (service: Service) => {
    addService(service);
    setDialogState(null);
  };

  const handleUpdateService = (service: Service) => {
    updateService(service);
    setDialogState(null);
  };
  
  const handleDeleteService = () => {
    if (dialogState?.type === 'delete') {
      deleteService(dialogState.service.id);
      toast({
        title: 'Servicio Eliminado',
        description: `El servicio "${dialogState.service.name}" ha sido eliminado.`,
      });
      setDialogState(null);
    }
  };

  const serviceToEdit = dialogState?.type === 'edit' ? dialogState.service : null;
  const serviceToDelete = dialogState?.type === 'delete' ? dialogState.service : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-headline text-2xl">Nuestros Servicios</h1>
           <Button onClick={() => setDialogState({ type: 'new' })}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Servicio
            </Button>
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
                    <DropdownMenuItem onClick={() => setDialogState({ type: 'edit', service })}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDialogState({ type: 'delete', service })}
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
      
      <NewServiceDialog
        open={dialogState?.type === 'new' || dialogState?.type === 'edit'}
        onOpenChange={(isOpen) => !isOpen && setDialogState(null)}
        serviceToEdit={serviceToEdit}
        onServiceCreated={dialogState?.type === 'edit' ? handleUpdateService : handleAddService}
      />

      <AlertDialog open={!!serviceToDelete} onOpenChange={(isOpen) => !isOpen && setDialogState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el servicio
              "{serviceToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialogState(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
