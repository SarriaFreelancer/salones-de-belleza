'use client';

import * as React from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { type Customer, type Appointment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';

function CustomerAppointments({ customerId, allAppointments, isLoadingAppointments }: { customerId: string, allAppointments: Appointment[], isLoadingAppointments: boolean }) {
  const firestore = useFirestore();
  const { services } = useServices();
  const { stylists } = useStylists();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = React.useState<string | null>(null);

  const customerAppointments = allAppointments.filter(a => a.customerId === customerId);

  const handleConfirmAppointment = async (pendingAppointment: Appointment) => {
    if (!firestore) return;
    setIsConfirming(pendingAppointment.id);
    try {
        const batch = writeBatch(firestore);
        const appointmentId = pendingAppointment.id;

        const adminAppointmentRef = doc(firestore, 'admin_appointments', appointmentId);
        batch.update(adminAppointmentRef, { status: 'confirmed' });

        const stylistAppointmentRef = doc(firestore, 'stylists', pendingAppointment.stylistId, 'appointments', appointmentId);
        batch.update(stylistAppointmentRef, { status: 'confirmed' });
        
        const customerAppointmentRef = doc(firestore, 'customers', customerId, 'appointments', appointmentId);
        batch.update(customerAppointmentRef, { status: 'confirmed' });

        await batch.commit();

        toast({
            title: '¡Cita Confirmada!',
            description: `La cita de ${pendingAppointment.customerName} ha sido confirmada.`,
        });

    } catch (error) {
        console.error('Error confirming appointment:', error);
        toast({
            variant: 'destructive',
            title: 'Error al Confirmar',
            description: 'No se pudo confirmar la cita. Revisa los permisos e inténtalo de nuevo.',
        });
    } finally {
        setIsConfirming(null);
    }
  };


  if (isLoadingAppointments) {
    return <div className="p-4 space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>;
  }

  if (!customerAppointments || customerAppointments.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Este cliente no tiene citas.</p>;
  }
  
  const pendingAppointments = customerAppointments.filter(a => a.status === 'scheduled');
  const upcomingOrPastAppointments = customerAppointments.filter(a => a.status !== 'scheduled');

  return (
    <div className="p-2 bg-muted/50">
        <h4 className="font-semibold p-2">Citas Pendientes de Confirmación</h4>
        {pendingAppointments.length > 0 ? (
             <ul className="space-y-3">
                {pendingAppointments.map((appointment) => {
                    const service = services.find(s => s.id === appointment.serviceId);
                    const stylist = stylists.find(s => s.id === appointment.stylistId);
                    const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
                    return (
                        <li key={appointment.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border bg-background p-3 gap-2">
                           <div className="flex-1 space-y-1">
                                <p><strong>Servicio:</strong> {service?.name || 'N/A'}</p>
                                <p><strong>Estilista:</strong> {stylist?.name || 'N/A'}</p>
                                <p><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                           </div>
                           <Button
                                size="sm"
                                onClick={() => handleConfirmAppointment(appointment)}
                                disabled={isConfirming === appointment.id}
                            >
                                {isConfirming === appointment.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Confirmar Cita
                           </Button>
                        </li>
                    )
                })}
             </ul>
        ) : (
             <p className="p-2 text-sm text-muted-foreground">No hay citas nuevas por confirmar para este cliente.</p>
        )}
        
        {upcomingOrPastAppointments.length > 0 && (
            <>
                <h4 className="font-semibold p-2 mt-4">Historial de Citas</h4>
                 <ul className="space-y-3">
                {upcomingOrPastAppointments.map((appointment) => {
                    const service = services.find(s => s.id === appointment.serviceId);
                    const stylist = stylists.find(s => s.id === appointment.stylistId);
                    const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
                    return (
                        <li key={appointment.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border bg-background p-3 gap-2 opacity-70">
                           <div className="flex-1 space-y-1">
                                <p><strong>Servicio:</strong> {service?.name || 'N/A'}</p>
                                <p><strong>Estilista:</strong> {stylist?.name || 'N/A'}</p>
                                <p><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                           </div>
                           <Badge variant={appointment.status === 'confirmed' ? 'default' : 'destructive'} className="capitalize">
                                {appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                           </Badge>
                        </li>
                    )
                })}
             </ul>
            </>
        )}
    </div>
  );
}


export default function CustomersPage() {
  const firestore = useFirestore();

  const customersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers');
  }, [firestore]);
  
  const adminAppointmentsCollection = useMemoFirebase(() => {
      if(!firestore) return null;
      return collection(firestore, 'admin_appointments');
  }, [firestore]);

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersCollection, true);
  const { data: allAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(adminAppointmentsCollection, true);

  const isLoading = isLoadingCustomers || isLoadingAppointments;

  if (isLoading) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>Clientes y Citas Pendientes</CardTitle>
          <CardDescription>Gestiona tus clientes y confirma sus nuevas citas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes y Citas Pendientes</CardTitle>
        <CardDescription>Gestiona tus clientes y confirma sus nuevas citas. Expande un cliente para ver sus citas pendientes.</CardDescription>
      </CardHeader>
      <CardContent>
        {customers && customers.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {customers.map((customer) => (
              <AccordionItem value={customer.id} key={customer.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left w-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://picsum.photos/seed/${customer.id}/100/100`} alt={customer.firstName} data-ai-hint="person face" />
                      <AvatarFallback>{customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{customer.firstName} {customer.lastName}</p>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CustomerAppointments customerId={customer.id} allAppointments={allAppointments || []} isLoadingAppointments={isLoadingAppointments} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="h-24 text-center text-muted-foreground flex items-center justify-center">
            No hay clientes registrados.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
