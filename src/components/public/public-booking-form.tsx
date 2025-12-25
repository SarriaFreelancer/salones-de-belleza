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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { add, format, parse, set, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, DayOfWeek, Service, Stylist } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  collection,
  Timestamp,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar un estilista.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface PublicBookingFormProps {
  services: Service[];
  stylists: Stylist[];
}

export default function PublicBookingForm({
  services,
  stylists,
}: PublicBookingFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    },
  });

  const resetDialog = () => {
    form.reset({
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    });
    setStep(1);
    setIsCalculating(false);
    setAvailableSlots([]);
  };

  const findAvailableSlots = async (values: FormValues) => {
    if (!firestore) return;
    setIsCalculating(true);
    setAvailableSlots([]);
    const { preferredDate, stylistId, serviceId } = values;

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

    const getDayOfWeek = (date: Date): DayOfWeek => {
      const dayIndex = date.getDay();
      const days: DayOfWeek[] = [
        'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
      ];
      return days[dayIndex];
    };
    
    const dayOfWeek = getDayOfWeek(preferredDate);
    const availabilityForDay = stylist.availability[dayOfWeek] || [];

    const appointmentsForStylistQuery = query(
        collection(firestore, 'stylists', stylistId, 'appointments'),
        where('start', '>=', startOfDay(preferredDate)),
        where('start', '<', endOfDay(preferredDate))
    );
    const querySnapshot = await getDocs(appointmentsForStylistQuery);
    const existingAppointments = querySnapshot.docs.map(doc => doc.data() as Appointment);


    const slots: Date[] = [];
    const serviceDuration = service.duration;

    availabilityForDay.forEach((availSlot) => {
      let baseDate = new Date(preferredDate);
      baseDate = set(baseDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

      let currentTime = parse(availSlot.start, 'HH:mm', baseDate);
      const endTime = parse(availSlot.end, 'HH:mm', baseDate);

      while (add(currentTime, { minutes: serviceDuration }) <= endTime) {
        const proposedEndTime = add(currentTime, { minutes: serviceDuration });

        const isOverlapping = existingAppointments.some((existingApp) => {
          const existingStart = existingApp.start instanceof Date ? existingApp.start : existingApp.start.toDate();
          const existingEnd = existingApp.end instanceof Date ? existingApp.end : existingApp.end.toDate();
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
        description: 'No se encontraron horarios disponibles para este estilista en la fecha seleccionada.',
      });
    }

    setIsCalculating(false);
    setStep(2);
  };

  const selectSlot = async (slot: Date) => {
    if (!firestore || !user) {
        toast({ title: "Error", description: "Debes iniciar sesión para reservar.", variant: "destructive" });
        return;
    }
    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) return;

    setIsCalculating(true);
    try {
      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });
      
      const newAppointmentData = {
        customerName: `${user.displayName || user.email}`,
        customerId: user.uid,
        serviceId: values.serviceId,
        stylistId: values.stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'scheduled' as const,
      };

      const batch = writeBatch(firestore);

      // 1. Create appointment in customer's subcollection
      const customerAppointmentRef = doc(collection(firestore, `customers/${user.uid}/appointments`));
      batch.set(customerAppointmentRef, { ...newAppointmentData, id: customerAppointmentRef.id });

      // 2. Create appointment in stylist's subcollection (to block time)
      const stylistAppointmentRef = doc(collection(firestore, `stylists/${values.stylistId}/appointments`));
      batch.set(stylistAppointmentRef, { ...newAppointmentData, id: stylistAppointmentRef.id });

      // 3. Create appointment in admin's central collection
      const adminAppointmentRef = doc(collection(firestore, `admin_appointments`));
      batch.set(adminAppointmentRef, { ...newAppointmentData, id: adminAppointmentRef.id });

      await batch.commit();

      toast({
        title: '¡Cita Agendada!',
        description: `Tu cita ha sido confirmada para el ${format(
          startDate, "eeee, d 'de' MMMM 'a las' HH:mm", { locale: es }
        )}.`,
      });

      resetDialog();

    } catch (error) {
      console.error('Error creating appointment: ', error);
      toast({
        title: 'Error al Agendar',
        description: 'No se pudo crear la cita. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  if (!user) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Reserva tu Cita</CardTitle>
          <CardDescription>Inicia sesión o regístrate para agendar tu próxima visita.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <p>Por favor, accede a tu cuenta para continuar.</p>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-xl">
      {step === 1 && (
        <>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-3xl">Reserva tu Cita</CardTitle>
            <CardDescription>
              Selecciona un servicio y encuentra un horario disponible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(findAvailableSlots)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servicio</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un servicio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stylistId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estilista</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un estilista" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stylists.map((stylist) => (
                              <SelectItem key={stylist.id} value={stylist.id}>
                                {stylist.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="preferredDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Elige una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <CardFooter className="p-0 pt-6">
                    <Button type="submit" disabled={isCalculating} className="w-full" size="lg">
                    {isCalculating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</>
                    ) : (
                        'Ver Horarios Disponibles'
                    )}
                    </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </>
      )}

      {step === 2 && (
        <>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(1)}>
                        <ChevronLeft />
                    </Button>
                    <div>
                        <CardTitle className="font-headline text-2xl">Elige un Horario</CardTitle>
                        <CardDescription>
                            Horarios disponibles para {selectedStylist?.name} el {format(form.getValues('preferredDate'), 'PPP', { locale: es })}.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border bg-muted/50 p-4 space-y-1 mb-4">
                    <h4 className="font-semibold text-sm">Resumen de tu Cita</h4>
                    <div className="flex justify-between items-center text-sm">
                        <p><strong>Servicio:</strong> {selectedService?.name}</p>
                        <p><strong>Duración:</strong> {selectedService?.duration} min.</p>
                    </div>
                </div>
                
                {isCalculating ? (
                <div className="flex h-48 items-center justify-center">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
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
                <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                    <p className="text-muted-foreground max-w-xs">
                    No se encontraron horarios disponibles con los criterios seleccionados.
                    </p>
                </div>
                )}
            </CardContent>
        </>
      )}
    </Card>
  );
}