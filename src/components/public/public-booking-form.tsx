'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { add, format, parse, set } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, Service, Stylist, DayOfWeek } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';

interface PublicBookingFormProps {
  services: Service[];
  stylists: Stylist[];
}

export default function PublicBookingForm({
  services,
  stylists,
}: PublicBookingFormProps) {
  const { user, clientLogin } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);

  const [serviceId, setServiceId] = useState('');
  const [stylistId, setStylistId] = useState('');
  const [preferredDate, setPreferredDate] = useState<Date | undefined>(
    new Date()
  );

  const resetForm = () => {
    setStep(1);
    setIsCalculating(false);
    setAvailableSlots([]);
    setServiceId('');
    setStylistId('');
    setPreferredDate(new Date());
  };

  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = date.getDay();
    const days: DayOfWeek[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[dayIndex];
  };

  const findAvailableSlots = async () => {
    if (!firestore || !preferredDate || !stylistId || !serviceId) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description: 'Por favor, selecciona servicio, estilista y fecha.',
      });
      return;
    }

    setIsCalculating(true);
    setAvailableSlots([]);

    const stylist = stylists.find((s) => s.id === stylistId);
    const service = services.find((s) => s.id === serviceId);

    if (!stylist || !service) {
      toast({
        title: 'Error',
        description: 'Estilista o servicio no válido.',
        variant: 'destructive',
      });
      setIsCalculating(false);
      return;
    }

    const dayOfWeek = getDayOfWeek(preferredDate);
    const availabilityForDay = stylist.availability[dayOfWeek] || [];

    // Fetch appointments for the selected stylist on the selected day
    const appointmentsQuery = query(
      collection(firestore, 'stylists', stylistId, 'appointments'),
      where('start', '>=', set(preferredDate, { hours: 0, minutes: 0, seconds: 0 })),
      where('start', '<=', set(preferredDate, { hours: 23, minutes: 59, seconds: 59 }))
    );

    const querySnapshot = await getDocs(appointmentsQuery);
    const existingAppointments = querySnapshot.docs.map(doc => doc.data() as Appointment);
    
    const slots: Date[] = [];
    const serviceDuration = service.duration;

    availabilityForDay.forEach((availSlot) => {
      let baseDate = new Date(preferredDate);
      baseDate = set(baseDate, {
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });

      let currentTime = parse(availSlot.start, 'HH:mm', baseDate);
      const endTime = parse(availSlot.end, 'HH:mm', baseDate);

      while (add(currentTime, { minutes: serviceDuration }) <= endTime) {
        const proposedEndTime = add(currentTime, { minutes: serviceDuration });

        const isOverlapping = existingAppointments.some((existingApp) => {
          const existingStart =
            existingApp.start instanceof Date
              ? existingApp.start
              : existingApp.start.toDate();
          const existingEnd =
            existingApp.end instanceof Date
              ? existingApp.end
              : existingApp.end.toDate();
          return currentTime < existingEnd && proposedEndTime > existingStart;
        });

        if (!isOverlapping) {
          slots.push(new Date(currentTime));
        }

        currentTime = add(currentTime, { minutes: 15 });
      }
    });

    setAvailableSlots(slots);

    if (slots.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay disponibilidad',
        description:
          'No se encontraron horarios disponibles para este estilista en la fecha seleccionada.',
      });
    }

    setIsCalculating(false);
    setStep(2);
  };
  
  const selectSlot = async (slot: Date) => {
    if (!firestore || !user) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No estás autenticado o la base de datos no está disponible."
        });
        return;
    }
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    setIsCalculating(true);
    try {
      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });
      
      const customerProfileQuery = query(collection(firestore, 'customers'), where('id', '==', user.uid));
      const customerProfileSnapshot = await getDocs(customerProfileQuery);
      
      if(customerProfileSnapshot.empty) {
        throw new Error("No se encontró el perfil del cliente.");
      }
      
      const customerData = customerProfileSnapshot.docs[0].data();

      const newAppointmentData: Omit<Appointment, 'id'> = {
        customerName: `${customerData.firstName} ${customerData.lastName}`,
        customerId: user.uid,
        serviceId: serviceId,
        stylistId: stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'scheduled',
      };
      
      const batch = writeBatch(firestore);

      // 1. Write to customer's subcollection
      const customerAppointmentRef = doc(collection(firestore, 'customers', user.uid, 'appointments'));
      batch.set(customerAppointmentRef, { ...newAppointmentData, id: customerAppointmentRef.id });

      // 2. Write to stylist's subcollection to block time
      const stylistAppointmentRef = doc(collection(firestore, 'stylists', stylistId, 'appointments'), customerAppointmentRef.id);
      batch.set(stylistAppointmentRef, { ...newAppointmentData, id: customerAppointmentRef.id });
      
      await batch.commit();

      toast({
        title: '¡Cita Agendada!',
        description: `Tu cita para ${service.name} ha sido confirmada para el ${format(
          startDate,
          "eeee, d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )}.`,
      });

      resetForm();
    } catch (error) {
      console.error('Error creating appointment: ', error);
      toast({
        title: 'Error al Agendar',
        description:
          'No se pudo crear la cita. Inténtalo de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const selectedService = services.find((s) => serviceId === s.id);
  const selectedStylist = stylists.find((s) => stylistId === s.id);

  if (!user) {
    return (
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Reserva tu Cita</CardTitle>
          <CardDescription>
            Para agendar una cita, por favor inicia sesión o crea una cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => clientLogin('', '')} size="lg">
            Iniciar Sesión / Registrarse
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Reserva tu Cita</CardTitle>
        <CardDescription>
          {step === 1
            ? 'Completa los detalles para encontrar un horario.'
            : 'Elige un horario disponible para confirmar.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Servicio</label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Estilista</label>
                <Select value={stylistId} onValueChange={setStylistId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estilista" />
                  </SelectTrigger>
                  <SelectContent>
                    {stylists.map((stylist) => (
                      <SelectItem key={stylist.id} value={stylist.id}>
                        {stylist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !preferredDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {preferredDate ? (
                      format(preferredDate, 'PPP', { locale: es })
                    ) : (
                      <span>Elige una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={preferredDate}
                    onSelect={setPreferredDate}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
              <h4 className="font-semibold">Resumen de la Cita</h4>
              <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                <p>
                  <strong>Cliente:</strong> {user.displayName || user.email}
                </p>
                <p>
                  <strong>Fecha:</strong>{' '}
                  {preferredDate
                    ? format(preferredDate, 'PPP', { locale: es })
                    : ''}
                </p>
                <div>
                  <strong>Servicio:</strong>{' '}
                  <Badge variant="secondary">{selectedService?.name}</Badge>
                </div>
                <div>
                  <strong>Estilista:</strong>{' '}
                  <Badge variant="secondary">{selectedStylist?.name}</Badge>
                </div>
              </div>
            </div>

            <h3 className="text-md font-medium pt-4">Horarios Disponibles</h3>
            {isCalculating ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
              </div>
            ) : availableSlots.length > 0 ? (
              <ScrollArea className="h-64 pr-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => selectSlot(slot)}
                      disabled={isCalculating}
                    >
                      {isCalculating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        format(slot, 'HH:mm')
                      )}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                <p className="text-muted-foreground">
                  No hay horarios disponibles con los criterios seleccionados.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {step === 1 && (
          <Button
            onClick={findAvailableSlots}
            disabled={isCalculating || !serviceId || !stylistId || !preferredDate}
            className="w-full"
            size="lg"
          >
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando...
              </>
            ) : (
              'Ver Horarios Disponibles'
            )}
          </Button>
        )}
        {step === 2 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStep(1);
              setAvailableSlots([]);
            }}
            className="w-full"
            size="lg"
          >
            Volver y Cambiar Selección
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
