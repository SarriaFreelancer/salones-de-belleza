
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
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { add, format, parse, set, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, DayOfWeek, Service, Stylist } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  collection,
  Timestamp,
  doc,
  writeBatch,
  where,
  getDocs,
  query,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Skeleton } from '@/components/ui/skeleton';

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

interface UserAppointmentListProps {
  userId: string;
}

function UserAppointmentList({ userId }: UserAppointmentListProps) {
    const firestore = useFirestore();
    const { services } = useServices();
    const { stylists } = useStylists();

    const appointmentsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(
            collection(firestore, 'customers', userId, 'appointments')
        );
    }, [firestore, userId]);
    
    const { data: myAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Mis Citas</CardTitle>
                <CardDescription>Revisa el estado de tus citas agendadas.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoadingAppointments ? (
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : myAppointments && myAppointments.length > 0 ? (
                    <ul className="space-y-3">
                        {myAppointments.map(appointment => {
                            const service = services.find(s => s.id === appointment.serviceId);
                            const stylist = stylists.find(s => s.id === appointment.stylistId);
                             const appointmentDate = appointment.start instanceof Date ? appointment.start : (appointment.start as Timestamp).toDate();

                            return (
                                <li key={appointment.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border bg-background p-3 gap-2">
                                   <div className="flex-1 space-y-1">
                                        <p><strong>Servicio:</strong> {service?.name || 'N/A'}</p>
                                        <p><strong>Estilista:</strong> {stylist?.name || 'N/A'}</p>
                                        <p><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                                   </div>
                                   <Badge variant={
                                       appointment.status === 'confirmed' ? 'default' 
                                       : appointment.status === 'cancelled' ? 'destructive' 
                                       : 'secondary'} className="capitalize">
                                        {
                                            appointment.status === 'confirmed' ? 'Confirmada' 
                                            : appointment.status === 'scheduled' ? 'Agendada' 
                                            : 'Cancelada'
                                        }
                                   </Badge>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-muted-foreground p-4">No tienes citas agendadas.</p>
                )}
            </CardContent>
        </Card>
    );
}


export default function PublicBookingForm({
  services,
  stylists,
}: PublicBookingFormProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    },
  });

  useEffect(() => {
    // When user logs in or out, reset the form to step 1
    if (!isUserLoading) {
      setStep(1);
      form.reset({
        serviceId: '',
        stylistId: '',
        preferredDate: new Date(),
      });
    }
  }, [user, isUserLoading, form]);


  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = getDay(date);
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
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Inicia Sesión',
            description: 'Debes iniciar sesión para poder buscar horarios y agendar una cita.'
        });
        return;
    }

    const { serviceId, stylistId, preferredDate } = form.getValues();
    if (!serviceId || !stylistId || !preferredDate || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description:
          'Por favor, completa todos los campos del servicio y estilista.',
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

    const startOfDay = set(preferredDate, {
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });
    const endOfDay = set(preferredDate, {
      hours: 23,
      minutes: 59,
      seconds: 59,
      milliseconds: 999,
    });

    const appointmentsQuery = query(
      collection(firestore, 'stylists', stylistId, 'appointments'),
      where('start', '>=', startOfDay),
      where('start', '<=', endOfDay)
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
      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });
      
      const appointmentData = {
        customerName: user.displayName || `${user.email}`,
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
        description: `Tu cita ha sido agendada para el ${format(
          startDate,
          "eeee, d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )}. Un administrador la confirmará pronto.`,
      });
      setStep(1); // Go back to the form
    } catch (error) {
      console.error('Error creating appointment: ', error);
      toast({
        title: 'Error al Guardar',
        description: 'No se pudo agendar la cita. Revisa la consola para más detalles.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  if (!user && !isUserLoading) {
     return (
       <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Reserva tu Cita</CardTitle>
          <CardDescription>
            Inicia sesión o crea una cuenta para agendar tu próxima visita.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center text-muted-foreground">Por favor, inicia sesión para continuar.</p>
        </CardContent>
       </Card>
     );
  }

  if (isUserLoading) {
      return <Skeleton className="h-96 w-full" />;
  }

  // If user is logged in, show their appointments or the booking form
  if (user && step === 1) {
    const hasAppointmentsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'customers', user.uid, 'appointments'),
            where('status', '!=', 'cancelled')
        );
    }, [firestore, user]);
    const { data: userAppointments, isLoading: isLoadingUserAppointments } = useCollection(hasAppointmentsQuery);
    
    if (isLoadingUserAppointments) {
      return <Skeleton className="h-96 w-full" />;
    }

    if (userAppointments && userAppointments.length > 0) {
        return <UserAppointmentList userId={user.uid} />
    }
  }


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
            Agendar Nueva Cita
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Completa los detalles para encontrar un horario.'
            : 'Elige un horario disponible para confirmar.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 1 && (
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
              <CardFooter className="p-0 pt-4">
                <Button type="submit" disabled={isCalculating} className="w-full">
                  {isCalculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    'Ver Horarios Disponibles'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
              <h4 className="font-semibold">Resumen de la Cita</h4>
              <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                <p>
                  <strong>Cliente:</strong> {user?.displayName || user?.email}
                </p>
                <p>
                  <strong>Fecha:</strong>{' '}
                  {form.getValues('preferredDate')
                    ? format(form.getValues('preferredDate'), 'PPP', {
                        locale: es,
                      })
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
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
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

            <CardFooter className="p-0 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(1);
                }}
                className="w-full"
              >
                Volver
              </Button>
            </CardFooter>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// These hooks are needed here for the UserAppointmentList component
const ServicesContext = createContext<{ services: Service[], isLoading: boolean } | undefined>(undefined);
const StylistsContext = createContext<{ stylists: Stylist[], isLoading: boolean } | undefined>(undefined);

const useServices = () => {
    const context = useContext(ServicesContext);
    if (!context) throw new Error("useServices must be used within a ServicesProvider");
    return context;
}
const useStylists = () => {
    const context = useContext(StylistsContext);
    if (!context) throw new Error("useStylists must be used within a StylistsProvider");
    return context;
}
