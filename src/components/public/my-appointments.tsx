'use client';

import * as React from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import type { Appointment, Service, Stylist } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Scissors, User } from 'lucide-react';

interface MyAppointmentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  services: Service[];
  stylists: Stylist[];
}

export default function MyAppointments({ open, onOpenChange, userId, services, stylists }: MyAppointmentsProps) {
  const firestore = useFirestore();

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return collection(firestore, 'customers', userId, 'appointments');
  }, [firestore, userId]);

  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsCollection);

  const sortedAppointments = React.useMemo(() => {
    if (!appointments) return [];
    return appointments.sort((a, b) => {
        const dateA = a.start instanceof Date ? a.start : a.start.toDate();
        const dateB = b.start instanceof Date ? b.start : b.start.toDate();
        return dateB.getTime() - dateA.getTime();
    });
  }, [appointments]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Mis Citas</SheetTitle>
          <SheetDescription>
            Aquí puedes ver el historial de tus citas agendadas.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 h-[calc(100vh-8rem)] overflow-y-auto pr-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                </Card>
            ))
          ) : sortedAppointments.length > 0 ? (
            sortedAppointments.map((appointment) => {
              const service = services.find((s) => s.id === appointment.serviceId);
              const stylist = stylists.find((s) => s.id === appointment.stylistId);
              const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
              
              return (
                <Card key={appointment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">{service?.name || 'Servicio Desconocido'}</CardTitle>
                            <CardDescription className="flex items-center gap-2 pt-1">
                                <Calendar className="h-4 w-4" />
                                {format(appointmentDate, "PPP", { locale: es })}
                            </CardDescription>
                        </div>
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
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                     <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span>Con: <strong>{stylist?.name || 'Estilista no asignado'}</strong></span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Hora: <strong>{format(appointmentDate, "p", { locale: es })}</strong></span>
                     </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center rounded-lg border-2 border-dashed">
                <Calendar className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No tienes citas agendadas.</p>
                <p className="text-xs text-muted-foreground">¡Anímate a reservar una!</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
