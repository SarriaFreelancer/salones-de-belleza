'use client';

import * as React from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { type Appointment, type Service, type Stylist } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

interface MyAppointmentsProps {
  userId: string;
  services: Service[];
  stylists: Stylist[];
}

export default function MyAppointments({ userId, services, stylists }: MyAppointmentsProps) {
  const firestore = useFirestore();

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore || !userId) return null; // Wait for userId
    return query(collection(firestore, 'customers', userId, 'appointments'), orderBy('start', 'desc'));
  }, [firestore, userId]);
  
  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsCollection, true);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!appointments || appointments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <Calendar className="h-12 w-12" />
            <p className="mt-4">Aún no tienes citas agendadas.</p>
        </div>
      )
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => {
        const service = services.find(s => s.id === appointment.serviceId);
        const stylist = stylists.find(s => s.id === appointment.stylistId);
        const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();

        return (
          <Card key={appointment.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{service?.name || 'Servicio Desconocido'}</CardTitle>
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
               <p className="text-sm text-muted-foreground">
                {format(appointmentDate, "eeee, dd 'de' MMMM, yyyy", { locale: es })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={stylist?.avatarUrl} alt={stylist?.name} data-ai-hint="woman portrait" />
                  <AvatarFallback>{stylist?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Con {stylist?.name || 'Estilista Desconocida'}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(appointmentDate, 'HH:mm')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
