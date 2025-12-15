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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  MoreHorizontal,
  PlusCircle,
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
import { collection, Timestamp } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

function AppointmentsPage() {
  const [date, setDate] = React.useState<Date | undefined>();
  React.useEffect(() => {
    // Set date only on the client side
    setDate(new Date());
  }, []);
  const [stylistFilter, setStylistFilter] = React.useState<string>('all');
  const [serviceFilter, setServiceFilter] = React.useState<string>('all');
  const { stylists } = useStylists();
  const { services } = useServices();
  const firestore = useFirestore();
  
  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'admin/appointments');
  }, [firestore]);
  
  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsCollection);

  const handleAppointmentCreated = (newAppointment: Appointment) => {
    // No need to manually update state, useCollection handles it
  };
  
  // Wait until date is set on the client to avoid hydration mismatch
  if (!date) {
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
    .map(appointment => {
        // Convert Firestore Timestamps to JS Date objects
        return {
            ...appointment,
            start: appointment.start instanceof Timestamp ? appointment.start.toDate() : new Date(appointment.start),
            end: appointment.end instanceof Timestamp ? appointment.end.toDate() : new Date(appointment.end),
        };
    })
    .filter((appointment) => {
      return (appointment.start as Date).toDateString() === date.toDateString();
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
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    Cargando citas...
                    </TableCell>
                </TableRow>
            ) : filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => {
                const service = services.find(s => s.id === appointment.serviceId);
                const stylist = stylists.find(s => s.id === appointment.stylistId);
                return (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">{appointment.customerName}</TableCell>
                    <TableCell>{service?.name || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{stylist?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {format(appointment.start as Date, 'Pp', { locale: es })}
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
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Cancelar</DropdownMenuItem>
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
  );
}

export default AppointmentsPage;
