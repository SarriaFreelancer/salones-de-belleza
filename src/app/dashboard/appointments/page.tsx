'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  MoreHorizontal,
  PlusCircle,
  Edit,
  Trash2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import type { Appointment } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import NewAppointmentDialog from '@/components/dashboard/new-appointment-dialog';
import { useStylists } from '@/hooks/use-stylists';
import { useServices } from '@/hooks/use-services';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
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

type DialogState = 
  | { type: 'delete'; appointment: Appointment }
  | { type: 'cancel'; appointment: Appointment }
  | null;


function AppointmentsPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [stylistFilter, setStylistFilter] = React.useState<string>('all');
  const [serviceFilter, setServiceFilter] = React.useState<string>('all');
  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  
  const { stylists, isLoading: isLoadingStylists } = useStylists();
  const { services, isLoading: isLoadingServices } = useServices();
  const firestore = useFirestore();
  const { toast } = useToast();

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'admin_appointments');
  }, [firestore]);
  
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollection);

  const handleAppointmentCreated = () => {
    // No need to manually update state, useCollection handles it
  };

  const handleCancelAppointment = async () => {
    if (dialogState?.type === 'cancel' && firestore) {
      const { appointment } = dialogState;
      try {
        const appointmentRef = doc(firestore, 'admin_appointments', appointment.id);
        await updateDoc(appointmentRef, { status: 'cancelled' });

        const stylistAppointmentRef = doc(firestore, 'stylists', appointment.stylistId, 'appointments', appointment.id);
        await updateDoc(stylistAppointmentRef, { status: 'cancelled' });
        
        toast({
          title: 'Cita Cancelada',
          description: `La cita de ${appointment.customerName} ha sido marcada como cancelada.`,
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
  
  const handleDeleteAppointment = async () => {
    if (dialogState?.type === 'delete' && firestore) {
      const { appointment } = dialogState;
      try {
        const appointmentRef = doc(firestore, 'admin_appointments', appointment.id);
        await deleteDoc(appointmentRef);
        
        const stylistAppointmentRef = doc(firestore, 'stylists', appointment.stylistId, 'appointments', appointment.id);
        await deleteDoc(stylistAppointmentRef);
        
        toast({
          title: 'Cita Eliminada',
          description: `La cita de ${appointment.customerName} ha sido eliminada permanentemente.`,
        });
      } catch (error) {
        console.error("Error deleting appointment: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo eliminar la cita. Inténtalo de nuevo.',
        });
      } finally {
        setDialogState(null);
      }
    }
  };
  
  const handleEditAppointment = () => {
    toast({
        variant: "default",
        title: "Función en Desarrollo",
        description: "La edición de citas estará disponible próximamente.",
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    });
  }

  const isLoading = isLoadingAppointments || isLoadingStylists || isLoadingServices;
  
  if (isLoading) {
    return (
       <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-[240px]" />
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[180px]" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="rounded-lg border shadow-sm">
           <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const filteredAppointments = (appointments || [])
    .filter((appointment) => {
      if (!appointment.start || !date) return false;
      const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
      return appointmentDate.toDateString() === date.toDateString();
    })
    .filter((appointment) => {
      if (stylistFilter === 'all') return true;
      return appointment.stylistId === stylistFilter;
    })
    .filter((appointment) => {
      if (serviceFilter === 'all') return true;
      return appointment.serviceId === serviceFilter;
    });

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: es }) : <span>Elige una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <Select value={stylistFilter} onValueChange={setStylistFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por estilista..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estilistas</SelectItem>
                {stylists.map((stylist) => (
                  <SelectItem key={stylist.id} value={stylist.id}>
                    {stylist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por servicio..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NewAppointmentDialog onAppointmentCreated={handleAppointmentCreated} appointments={appointments || []}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Agendar Cita
            </Button>
          </NewAppointmentDialog>
        </div>

        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead className="hidden md:table-cell">Estilista</TableHead>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment) => {
                  const service = services.find(s => s.id === appointment.serviceId);
                  const stylist = stylists.find(s => s.id === appointment.stylistId);
                  const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
                  const isCancelled = appointment.status === 'cancelled';
                  return (
                    <TableRow key={appointment.id} data-state={isCancelled ? 'disabled' : ''} className={isCancelled ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{appointment.customerName}</TableCell>
                      <TableCell>{service?.name || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">{stylist?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {format(appointmentDate, 'Pp', { locale: es })}
                      </TableCell>
                      <TableCell>
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
                          {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isCancelled}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleEditAppointment}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDialogState({ type: 'cancel', appointment })}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar Cita
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDialogState({ type: 'delete', appointment })} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Cita
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay citas para la selección actual.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog open={!!dialogState} onOpenChange={(isOpen) => !isOpen && setDialogState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogState?.type === 'delete' ? '¿Estás realmente seguro?' : 'Confirmar Cancelación'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogState?.type === 'delete' 
                ? 'Esta acción no se puede deshacer. La cita será eliminada permanentemente de la base de datos.'
                : 'Esto cambiará el estado de la cita a "Cancelada". Esta acción se puede revertir editando la cita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={dialogState?.type === 'delete' ? handleDeleteAppointment : handleCancelAppointment} 
              className={dialogState?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {dialogState?.type === 'delete' ? 'Confirmar Eliminación' : 'Confirmar Cancelación'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AppointmentsPage;
