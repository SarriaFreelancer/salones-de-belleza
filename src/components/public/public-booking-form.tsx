
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { add, format, parse, set, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import type { Appointment, Service, Stylist, DayOfWeek, Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';
import { Skeleton } from '@/components/ui/skeleton';

const bookingFormSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar un estilista.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface PublicBookingFormProps {
  services: Service[];
  stylists: Stylist[];
}

export default function PublicBookingForm({ services, stylists }: PublicBookingFormProps) {
  const [step, setStep] = useState(1);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  const { user, isUserLoading } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      preferredDate: new Date(),
      serviceId: '',
      stylistId: '',
    },
  });

  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = getDay(date);
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  };

  const findAvailableSlots = async (values: BookingFormValues) => {
    const { serviceId, stylistId, preferredDate } = values;
    if (!firestore || !serviceId || !stylistId || !preferredDate) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description: 'Por favor, selecciona un servicio, estilista y fecha.',
      });
      return;
    }

    setIsCalculating(true);
    setAvailableSlots([]);

    const service = services.find((s) => s.id === serviceId);
    const stylist = stylists.find((s) => s.id === stylistId);

    if (!service || !stylist) {
      setIsCalculating(false);
      toast({
        variant: 'destructive',
        title: 'Error de Datos',
        description: 'No se pudo encontrar el servicio o estilista seleccionado.',
      });
      return;
    }

    const dayOfWeek = getDayOfWeek(preferredDate);
    const availabilityForDay = stylist.availability[dayOfWeek] || [];

    const startOfDay = set(preferredDate, { hours: 0, minutes: 0, seconds: 0 });
    const endOfDay = set(preferredDate, { hours: 23, minutes: 59, seconds: 59 });

    const appointmentsQuery = query(
      collection(firestore, 'admin_appointments'),
      where('stylistId', '==', stylistId),
      where('start', '>=', startOfDay),
      where('start', '<=', endOfDay)
    );

    const querySnapshot = await getDocs(appointmentsQuery);
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
          if (existingApp.status === 'cancelled') return false;
          const existingStart = (existingApp.start as Timestamp).toDate();
          const existingEnd = (existingApp.end as Timestamp).toDate();
          return currentTime < existingEnd && proposedEndTime > existingStart;
        });
        if (!isOverlapping) {
          slots.push(new Date(currentTime));
        }
        currentTime = add(currentTime, { minutes: 15 });
      }
    });

    setAvailableSlots(slots);
    setIsCalculating(false);
    setStep(2);
  };

  const selectSlot = async (slot: Date) => {
    if (!firestore || !user) return;
    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) return;

    setIsSubmitting(true);
    try {
      const customerName = user.displayName || `${user.email?.split('@')[0]}`;
      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });
      
      const appointmentData = {
        customerName: customerName,
        customerId: user.uid,
        serviceId: values.serviceId,
        stylistId: values.stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'scheduled',
      };
      
      const appointmentId = doc(collection(firestore, 'admin_appointments')).id;

      const batch = writeBatch(firestore);

      const mainAppointmentRef = doc(firestore, 'admin_appointments', appointmentId);
      batch.set(mainAppointmentRef, { ...appointmentData, id: appointmentId });
      
      const stylistAppointmentRef = doc(firestore, 'stylists', values.stylistId, 'appointments', appointmentId);
      batch.set(stylistAppointmentRef, { ...appointmentData, id: appointmentId });

      const customerAppointmentRef = doc(firestore, 'customers', user.uid, 'appointments', appointmentId);
      batch.set(customerAppointmentRef, { ...appointmentData, id: appointmentId });
      
      await batch.commit();

      toast({
        title: '¡Cita Agendada!',
        description: `Tu cita ha sido registrada para el ${format(
          startDate,
          "eeee, d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )}. Recibirás una confirmación pronto.`,
      });
      
      fetchMyAppointments();
      setStep(1);

    } catch (error) {
      console.error('Error creating appointment: ', error);
      toast({
        title: 'Error al Agendar',
        description: 'No se pudo guardar la cita. Revisa la consola para más detalles.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!user) return;
    setIsCancelling(appointment.id);
    try {
      const result = await cancelAppointment({
        appointmentId: appointment.id,
        customerId: user.uid,
        stylistId: appointment.stylistId
      });
      if (result.success) {
        toast({
          title: 'Cita Cancelada',
          description: 'Tu cita ha sido cancelada exitosamente.',
        });
        fetchMyAppointments();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Cancelar',
        description: error.message || 'No se pudo cancelar la cita. Inténtalo de nuevo.',
      });
    } finally {
      setIsCancelling(null);
    }
  };
  
  const fetchMyAppointments = useCallback(async () => {
    if (!user || !firestore) {
      setMyAppointments([]);
      setIsLoadingAppointments(false);
      return;
    }
    setIsLoadingAppointments(true);
    try {
      const q = query(collection(firestore, `customers/${user.uid}/appointments`));
      const querySnapshot = await getDocs(q);
      const userAppointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setMyAppointments(userAppointments.sort((a,b) => (b.start as Timestamp).toMillis() - (a.start as Timestamp).toMillis()));
    } catch (error) {
      console.error("Error fetching user's appointments:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar tus citas.' });
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [user, firestore, toast]);

  useEffect(() => {
    if (user) {
      fetchMyAppointments();
    } else if (!isUserLoading) {
        setIsLoadingAppointments(false);
        setMyAppointments([]);
    }
  }, [user, isUserLoading, fetchMyAppointments]);

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  if (!user || isUserLoading) {
    return (
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader className="text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
            Reserva tu Cita
          </h2>
          <p className="text-foreground/80 md:text-xl/relaxed">
            Inicia sesión o crea una cuenta para empezar.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
            <p className="text-muted-foreground">
              {isUserLoading ? 'Cargando...' : 'Por favor, inicia sesión para ver tus citas y agendar una nueva.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const upcomingAppointments = myAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  const pastAppointments = myAppointments.filter(a => a.status === 'cancelled' || new Date() > (a.start as Timestamp).toDate());
  
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
            {step === 1 ? 'Reserva tu Cita' : 'Elige un Horario'}
          </h2>
          <CardDescription>
            {step === 1 ? 'Sigue los pasos para encontrar un horario disponible.' : 'Selecciona una hora para confirmar tu cita.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(findAvailableSlots)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                              className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            >
                              {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Elige una fecha</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isCalculating}>
                  {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Buscar Horarios
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                <h4 className="font-semibold">Resumen de la Cita</h4>
                <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  <p>
                    <strong>Cliente:</strong> {user.displayName || user.email}
                  </p>
                  <p>
                    <strong>Fecha:</strong>{' '}
                    {form.getValues('preferredDate')
                      ? format(form.getValues('preferredDate'), 'PPP', { locale: es })
                      : ''}
                  </p>
                  <div>
                    <strong>Servicio:</strong> <Badge variant="secondary">{selectedService?.name}</Badge>
                  </div>
                  <div>
                    <strong>Estilista:</strong> <Badge variant="secondary">{selectedStylist?.name}</Badge>
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
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableSlots.map((slot, index) => (
                      <Button key={index} variant="outline" onClick={() => selectSlot(slot)} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : format(slot, 'HH:mm')}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                  <p className="text-muted-foreground">No hay horarios disponibles con los criterios seleccionados.</p>
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Volver</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Mis Citas</CardTitle>
          <CardDescription>Aquí puedes ver tus próximas citas y tu historial.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
                <h4 className="font-semibold text-sm">Próximas Citas</h4>
                 {isLoadingAppointments ? (
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : myAppointments.length > 0 ? (
                myAppointments.map(appointment => {
                  const service = services.find(s => s.id === appointment.serviceId);
                  const stylist = stylists.find(s => s.id === appointment.stylistId);
                  const isCancelable = appointment.status === 'scheduled' || appointment.status === 'confirmed';

                  return (
                    <div key={appointment.id} className="rounded-md border p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{service?.name || 'Servicio no encontrado'}</p>
                          <p>con {stylist?.name || 'Estilista no encontrado'}</p>
                          <p className="text-muted-foreground">{format((appointment.start as Timestamp).toDate(), "eeee, d 'de' MMMM, HH:mm", { locale: es })}</p>
                        </div>
                        <Badge variant={appointment.status === 'confirmed' ? 'default' : appointment.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">
                            {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </Badge>
                      </div>
                      {isCancelable && (
                        <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-destructive mt-2"
                            onClick={() => handleCancelAppointment(appointment)}
                            disabled={isCancelling === appointment.id}
                        >
                             {isCancelling === appointment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Cancelar Cita
                        </Button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-sm">No tienes citas agendadas.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
