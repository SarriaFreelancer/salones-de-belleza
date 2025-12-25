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
import { type Customer, type Appointment, type Service, type Stylist } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';

function CustomerAppointments({ customerId }: { customerId: string }) {
  const firestore = useFirestore();
  const { services } = useServices();
  const { stylists } = useStylists();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = React.useState<string | null>(null);

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers', customerId, 'appointments');
  }, [firestore, customerId]);

  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsCollection, true);

  const handleConfirmAppointment = async (appointment: Appointment) => {
    if (!firestore) return;
    setIsConfirming(appointment.id);
    try {
      const batch = writeBatch(firestore);

      // 1. Copy to admin_appointments
      const adminAppointmentRef = doc(collection(firestore, 'admin_appointments'));
      batch.set(adminAppointmentRef, { ...appointment, id: adminAppointmentRef.id, status: 'confirmed' });

      // 2. Copy to stylist's schedule
      const stylistAppointmentRef = doc(firestore, 'stylists', appointment.stylistId, 'appointments', adminAppointmentRef.id);
      batch.set(stylistAppointmentRef, { ...appointment, id: adminAppointmentRef.id, status: 'confirmed' });
      
      // 3. Update customer's appointment status
      const customerAppointmentRef = doc(firestore, 'customers', customerId, 'appointments', appointment.id);
      batch.update(customerAppointmentRef, { status: 'confirmed' });

      await batch.commit();

      toast({
        title: '¡Cita Confirmada!',
        description: `La cita de ${appointment.customerName} ha sido confirmada y añadida al calendario.`,
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


  if (isLoading) {
    return <div className="p-4 space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>;
  }

  if (!appointments || appointments.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Este cliente no tiene citas.</p>;
  }
  
  const pendingAppointments = appointments.filter(a => a.status === 'scheduled');

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
    </div>
  );
}


export default function CustomersPage() {
  const firestore = useFirestore();

  const customersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers');
  }, [firestore]);
  
  const { data: customers, isLoading } = useCollection<Customer>(customersCollection);

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
                  <CustomerAppointments customerId={customer.id} />
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
