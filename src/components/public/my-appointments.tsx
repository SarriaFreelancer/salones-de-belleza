'use client';
import * as React from 'react';
import type { Appointment, Service, Stylist } from '@/lib/types';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, buttonVariants } from '@/components/ui/button';
import { MoreHorizontal, Trash2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

interface MyAppointmentsProps {
  userId: string;
  services: Service[];
  stylists: Stylist[];
}

type DialogState = { type: 'cancel'; appointment: Appointment } | null;

export default function MyAppointments({ userId, services, stylists }: MyAppointmentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogState, setDialogState] = React.useState<DialogState>(null);

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return collection(firestore, 'customers', userId, 'appointments');
  }, [firestore, userId]);

  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsCollection, true);

  const handleCancelAppointment = async () => {
    if (dialogState?.type === 'cancel' && firestore) {
      const { appointment } = dialogState;
      try {
        const batch = writeBatch(firestore);

        // Update status in customer's subcollection
        const customerAppointmentRef = doc(firestore, 'customers', userId, 'appointments', appointment.id);
        batch.update(customerAppointmentRef, { status: 'cancelled' });
        
        // Also update in admin and stylist collections if it was confirmed
        if (appointment.status === 'confirmed') {
          const adminAppointmentRef = doc(firestore, 'admin_appointments', appointment.id);
          batch.update(adminAppointmentRef, { status: 'cancelled' });

          const stylistAppointmentRef = doc(firestore, 'stylists', appointment.stylistId, 'appointments', appointment.id);
          batch.update(stylistAppointmentRef, { status: 'cancelled' });
        } else {
            // if it was just 'scheduled' (pending), we can just delete it from the customer's view
            // as it doesn't exist anywhere else. For simplicity we'll just mark as cancelled.
        }

        await batch.commit();
        
        toast({
          title: 'Cita Cancelada',
          description: `Tu cita ha sido cancelada.`,
        });
      } catch (error) {
        console.error("Error cancelling appointment: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo cancelar la cita. Inténtalo de nuevo.',
        });
      } finally {
        setDialogState(null);
      }
    }
  };
  
  if (isLoading) {
    return (
        <div className="space-y-4 p-4">
            {Array.from({length: 3}).map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border p-4 gap-4">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
            ))}
        </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-center">
        <p className="text-muted-foreground">No tienes citas agendadas.</p>
      </div>
    );
  }

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = a.start instanceof Date ? a.start : a.start.toDate();
    const dateB = b.start instanceof Date ? b.start : b.start.toDate();
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <>
      <div className="space-y-4 p-1 sm:p-4">
        {sortedAppointments.map((appointment) => {
          const service = services.find((s) => s.id === appointment.serviceId);
          const stylist = stylists.find((s) => s.id === appointment.stylistId);
          const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
          const isCancelled = appointment.status === 'cancelled';
          const isPast = appointmentDate < new Date();

          return (
            <div key={appointment.id} className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-md border p-4 gap-4 ${isCancelled || (isPast && appointment.status !== 'confirmed') ? 'opacity-60 bg-muted/50' : 'bg-background'}`}>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-foreground">
                  {service?.name || 'Servicio no encontrado'}
                </p>
                <p className="text-sm text-muted-foreground">
                  con {stylist?.name || 'Estilista no encontrado'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(appointmentDate, "eeee, d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    appointment.status === 'confirmed'
                      ? 'default'
                      : appointment.status === 'cancelled'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="capitalize"
                >
                  {appointment.status === 'scheduled'
                    ? 'Pendiente'
                    : appointment.status === 'confirmed'
                    ? 'Confirmada'
                    : 'Cancelada'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isCancelled || isPast}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() => setDialogState({ type: 'cancel', appointment })}
                      disabled={isCancelled || isPast}
                      className="text-destructive focus:text-destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      <span>Cancelar Cita</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
      <AlertDialog open={!!dialogState} onOpenChange={(isOpen) => !isOpen && setDialogState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar Cancelación?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás segura de que quieres cancelar esta cita? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelAppointment} 
              className={buttonVariants({variant: 'destructive'})}
            >
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
