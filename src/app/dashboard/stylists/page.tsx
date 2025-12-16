'use client';

import * as React from 'react';
import type { Stylist, Appointment } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CalendarCog, MoreVertical, Edit, Trash2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AvailabilityEditor from '@/components/dashboard/availability-editor';
import { useStylists } from '@/hooks/use-stylists';
import NewStylistDialog from '@/components/dashboard/new-stylist-dialog';
import { useToast } from '@/hooks/use-toast';
import { useServices } from '@/hooks/use-services';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

type DialogState = 
  | { type: 'new' }
  | { type: 'edit'; stylist: Stylist }
  | { type: 'delete'; stylist: Stylist }
  | { type: 'availability'; stylist: Stylist }
  | null;

function StylistsPage() {
  const [today, setToday] = React.useState<Date | undefined>(undefined);
  const { stylists, addStylist, updateStylist, deleteStylist, isLoading: isLoadingStylists } = useStylists();
  const { services } = useServices();
  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    setToday(new Date());
  }, []);

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'admin_appointments');
  }, [firestore]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollection);

  const handleSaveAvailability = (updatedStylist: Stylist) => {
    updateStylist(updatedStylist);
    setDialogState(null);
  };

  const handleAddOrUpdateStylist = (stylist: Stylist | Omit<Stylist, 'id' | 'availability'>) => {
    if ('id' in stylist) {
      updateStylist(stylist);
      toast({
        title: 'Estilista Actualizado',
        description: `Los datos de "${stylist.name}" han sido actualizados.`,
      });
    } else {
      addStylist(stylist);
      toast({
        title: 'Estilista Añadido',
        description: `El estilista ha sido añadido al equipo.`,
      });
    }
    setDialogState(null);
  };
  
  const handleDeleteStylist = () => {
    if (dialogState?.type === 'delete') {
      deleteStylist(dialogState.stylist.id);
      toast({
        title: 'Estilista Eliminado',
        description: `El estilista "${dialogState.stylist.name}" ha sido eliminado.`,
      });
      setDialogState(null);
    }
  };

  const stylistToEdit = dialogState?.type === 'edit' ? dialogState.stylist : null;
  const stylistToDelete = dialogState?.type === 'delete' ? dialogState.stylist : null;
  const stylistForAvailability = dialogState?.type === 'availability' ? dialogState.stylist : null;

  if (!isClient || isLoadingStylists || isLoadingAppointments) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-headline text-2xl">Equipo de Estilistas</h1>
          <Button onClick={() => setDialogState({ type: 'new' })}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Estilista
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stylists.map((stylist) => {
             const todaysAppointments = (appointments || [])
              .filter(
                (a) => {
                  const appointmentDate = a.start instanceof Date ? a.start : a.start.toDate();
                  return a.stylistId === stylist.id &&
                  today && appointmentDate.toDateString() === today.toDateString() &&
                  a.status !== 'cancelled'
                }
              ).sort((a,b) => (a.start instanceof Date ? a.start.getTime() : a.start.toDate().getTime()) - (b.start instanceof Date ? b.start.getTime() : b.start.toDate().getTime()));

            return (
              <Card key={stylist.id} className="relative">
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialogState({ type: 'edit', stylist })}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Editar</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDialogState({ type: 'delete', stylist })}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Eliminar</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4 pr-12">
                  <Avatar className="h-16 w-16 border-2 border-primary">
                    <AvatarImage src={stylist.avatarUrl} alt={stylist.name} data-ai-hint="woman portrait" />
                    <AvatarFallback>{stylist.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="grid gap-1">
                    <CardTitle className="font-headline text-xl">{stylist.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full mb-4" onClick={() => setDialogState({ type: 'availability', stylist })}>
                      <CalendarCog className="mr-2 h-4 w-4" />
                      Gestionar Horario
                  </Button>
                  
                  <h4 className="mb-2 font-semibold">Citas para Hoy</h4>
                  {todaysAppointments.length > 0 ? (
                    <div className="space-y-2">
                      {todaysAppointments.map((appointment) => {
                        const service = services.find(
                          (s) => s.id === appointment.serviceId
                        );
                        const appointmentStartDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
                        const appointmentEndDate = appointment.end instanceof Date ? appointment.end : appointment.end.toDate();

                        return (
                          <div
                            key={appointment.id}
                            className="text-sm text-muted-foreground"
                          >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{appointment.customerName}</span>
                                <Badge variant="secondary">{service?.name}</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                {format(appointmentStartDate, 'HH:mm')} - {format(appointmentEndDate, 'HH:mm')}
                                </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay citas agendadas para hoy.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogState?.type === 'availability'} onOpenChange={(open) => !open && setDialogState(null)}>
        {stylistForAvailability && (
            <DialogContent className="max-w-2xl">
                <AvailabilityEditor 
                    stylist={stylistForAvailability} 
                    onSave={handleSaveAvailability} 
                />
            </DialogContent>
        )}
      </Dialog>

      <NewStylistDialog
        open={dialogState?.type === 'new' || dialogState?.type === 'edit'}
        onOpenChange={(isOpen) => !isOpen && setDialogState(null)}
        stylistToEdit={stylistToEdit}
        onStylistSaved={handleAddOrUpdateStylist}
      />

      <AlertDialog open={!!stylistToDelete} onOpenChange={(isOpen) => !isOpen && setDialogState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente a
              "{stylistToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialogState(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStylist} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default StylistsPage;
