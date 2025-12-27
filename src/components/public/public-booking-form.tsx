
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  XCircle,
  Clock,
  User,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import type { Service, Stylist, Appointment, DayOfWeek } from '@/lib/types';
import { format, add, parse, set, getDay, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useMemoFirebase,
  useUser,
  WithId,
} from '@/firebase';
import {
  collection,
  Timestamp,
  writeBatch,
  doc,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';

const bookingSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar una estilista.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface PublicBookingFormProps {
  services: Service[];
  stylists: Stylist[];
}

export default function PublicBookingForm({
  services,
  stylists,
}: PublicBookingFormProps) {
  const { user, isUserLoading, clientLogin, clientSignup } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [myAppointments, setMyAppointments] = useState<WithId<Appointment>[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    },
  });
  
  const fetchAppointments = useCallback(async () => {
    if (!user || !firestore) {
      setMyAppointments([]);
      setIsLoadingAppointments(false);
      return;
    }
    setIsLoadingAppointments(true);
    try {
        const appointmentsCollection = collection(firestore, 'customers', user.uid, 'appointments');
        const q = query(appointmentsCollection, orderBy('start', 'desc'));
        const snapshot = await getDocs(q);
        const userAppointments = snapshot.docs.map(doc => ({ ...doc.data() as Appointment, id: doc.id }));
        setMyAppointments(userAppointments);
    } catch (error) {
        console.error("Error fetching user appointments: ", error);
        toast({
            variant: "destructive",
            title: "Error al cargar tus citas",
            description: "No se pudieron obtener tus citas. Intenta recargar la página."
        })
    } finally {
        setIsLoadingAppointments(false);
    }
  }, [user, firestore, toast]);

  useEffect(() => {
      fetchAppointments();
  }, [fetchAppointments]);
  
  const handleCancelAppointment = async (appointment: Appointment) => {
    try {
      const result = await cancelAppointment({
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        stylistId: appointment.stylistId,
      });

      if (result.success) {
        toast({
          title: "Cita Cancelada",
          description: "Tu cita ha sido cancelada exitosamente."
        });
        fetchAppointments(); // Refresh the list
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast({
        variant: 'destructive',
        title: 'Error al Cancelar',
        description: 'No se pudo cancelar la cita. Por favor, inténtalo de nuevo.',
      });
    }
  };


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

    // Fetch existing appointments for the stylist on that day from the public-facing subcollection
    const appointmentsCollection = collection(firestore, 'stylists', stylistId, 'appointments');
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

    const q = query(
      appointmentsCollection,
      where('start', '>=', startOfDay),
      where('start', '<=', endOfDay)
    );

    try {
        const appointmentsSnapshot = await getDocs(q);

        const existingAppointments = appointmentsSnapshot.docs
        .map((doc) => doc.data() as Appointment)
        .filter((app) => app.status !== 'cancelled');

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
            const existingStart = (existingApp.start as Timestamp).toDate();
            const existingEnd = (existingApp.end as Timestamp).toDate();
            return currentTime < existingEnd && proposedEndTime > existingStart;
            });

            if (!isOverlapping) {
            slots.push(new Date(currentTime));
            }

            currentTime = add(currentTime, { minutes: 15 }); // Check every 15 minutes
        }
        });

        setAvailableSlots(slots);
        setStep(2);
    } catch(error) {
        console.error("Error fetching stylist appointments: ", error);
        toast({
            variant: "destructive",
            title: "Error de Permisos",
            description: "No se pudieron verificar los horarios. Asegúrate de haber iniciado sesión."
        });
    } finally {
        setIsCalculating(false);
    }
  };

  const selectSlot = (slot: Date) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const confirmAppointment = async () => {
    if (!firestore || !user || !selectedSlot) return;

    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) return;

    setIsSubmitting(true);
    try {
      const [firstName, ...lastNameParts] = user.displayName?.split(' ') || [
        '',
        '',
      ];

      const startDate = selectedSlot;
      const endDate = add(startDate, { minutes: service.duration });

      const appointmentData = {
        customerName: user.displayName || 'Cliente Registrado',
        customerId: user.uid,
        serviceId: values.serviceId,
        stylistId: values.stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'scheduled' as 'scheduled',
      };

      const appointmentId = doc(collection(firestore, 'admin_appointments')).id;

      const batch = writeBatch(firestore);

      const mainAppointmentRef = doc(
        firestore,
        'admin_appointments',
        appointmentId
      );
      batch.set(mainAppointmentRef, { ...appointmentData, id: appointmentId });

      const stylistAppointmentRef = doc(
        firestore,
        'stylists',
        values.stylistId,
        'appointments',
        appointmentId
      );
      batch.set(stylistAppointmentRef, { ...appointmentData, id: appointmentId });

      const customerAppointmentRef = doc(
        firestore,
        'customers',
        user.uid,
        'appointments',
        appointmentId
      );
      batch.set(customerAppointmentRef, { ...appointmentData, id: appointmentId });

      await batch.commit();

      toast({
        title: '¡Cita Agendada!',
        description: `Tu cita ha sido agendada para el ${format(
          startDate,
          "eeee, d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )}. Recibirás una confirmación pronto.`,
      });
      fetchAppointments();
      setStep(4);
    } catch (error) {
      console.error('Error creating appointment: ', error);
      toast({
        title: 'Error al Agendar',
        description:
          'No se pudo agendar tu cita. Revisa la consola para más detalles.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    form.reset({
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    });
    setStep(1);
    setSelectedSlot(null);
  };
  
  if (isUserLoading) {
      return (
          <Card className="mx-auto max-w-3xl">
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
                    Cargando...
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <Skeleton className="h-64 w-full" />
              </CardContent>
          </Card>
      );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
            Reserva tu Cita
          </CardTitle>
          <CardDescription className="md:text-xl/relaxed">
            Inicia sesión o crea una cuenta para poder agendar tu cita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuth />
        </CardContent>
      </Card>
    );
  }
  
  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);
  const upcomingAppointments = myAppointments.filter(a => a.status !== 'cancelled' && new Date() < (a.start as Timestamp).toDate());
  const pastAppointments = myAppointments.filter(a => a.status === 'confirmed' && new Date() > (a.start as Timestamp).toDate());


  return (
    <Card className="mx-auto w-full max-w-4xl">
      <div className="grid md:grid-cols-5">
        <div className="md:col-span-2 md:border-r">
           <CardHeader>
               <CardTitle className="font-headline text-2xl">
                  Mis Citas
               </CardTitle>
               <CardDescription>
                   Aquí puedes ver tus próximas citas y tu historial.
               </CardDescription>
           </CardHeader>
           <CardContent>
                <h3 className="font-semibold text-lg mb-2">Próximas Citas</h3>
                <ScrollArea className="h-60 pr-4">
                    {isLoadingAppointments ? (
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : myAppointments.length > 0 ? (
                       <ul className="space-y-3">
                        {myAppointments.map(appointment => {
                           const service = services.find(s => s.id === appointment.serviceId);
                           const stylist = stylists.find(s => s.id === appointment.stylistId);
                           const appointmentDate = (appointment.start as Timestamp).toDate();
                           const isPastAppointment = isPast(appointmentDate);

                           return (
                               <li key={appointment.id} className="relative flex flex-col justify-between rounded-lg border p-3 gap-2 bg-card">
                                   <div className="flex-1 space-y-1 text-sm">
                                        <p className="font-semibold">{service?.name || "Servicio no encontrado"}</p>
                                        <p className="text-muted-foreground">Con: {stylist?.name || 'Estilista no encontrada'}</p>
                                        <p className="text-muted-foreground">{format(appointmentDate, "PPP 'a las' p", {locale: es})}</p>
                                   </div>
                                   <div className="flex items-center justify-between">
                                        <Badge variant={appointment.status === 'confirmed' ? 'default' : appointment.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">
                                            {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                                        </Badge>
                                        {!isPastAppointment && appointment.status !== 'cancelled' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">Cancelar</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás segura de cancelar?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. Tu cita será cancelada.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleCancelAppointment(appointment)}>Confirmar Cancelación</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                   </div>
                               </li>
                           )
                        })}
                       </ul>
                    ) : (
                       <div className="text-center text-muted-foreground py-10">
                           <p>No tienes citas agendadas.</p>
                       </div>
                    )}
                </ScrollArea>
                 <Button className="w-full mt-4" onClick={resetFlow}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agendar Nueva Cita
                </Button>
           </CardContent>
        </div>
        <div className="md:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
              {step === 1 && 'Selecciona tu Servicio'}
              {step === 2 && 'Elige un Horario'}
              {step === 3 && 'Confirma tu Cita'}
              {step === 4 && '¡Todo Listo!'}
            </CardTitle>
            <CardDescription className="md:text-xl/relaxed">
              {step === 1 && 'Dinos qué servicio te gustaría y con quién.'}
              {step === 2 &&
                'Estos son los horarios disponibles para tu selección.'}
              {step === 3 && 'Revisa los detalles y confirma para finalizar.'}
              {step === 4 &&
                'Tu cita ha sido registrada. ¡Te esperamos en el salón!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(findAvailableSlots)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="serviceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Servicio</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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
                  <CardFooter className="px-0 pt-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isCalculating}
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
                  </CardFooter>
                </form>
              </Form>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div
                  className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2"
                >
                  <h4 className="font-semibold">Resumen de tu Selección</h4>
                  <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
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
                {isCalculating ? (
                   <div className="flex h-48 items-center justify-center">
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
                          {format(slot, 'HH:mm')}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                   <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                    <p className="text-muted-foreground max-w-xs">
                      No hay horarios disponibles para {selectedStylist?.name} en esta fecha.
                    </p>
                  </div>
                )}
                <CardFooter className="px-0 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-full"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Volver a la Selección
                  </Button>
                </CardFooter>
              </div>
            )}

            {step === 3 && selectedSlot && (
              <div className="space-y-6">
                <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex justify-between items-center">
                         <h4 className="text-lg font-semibold">Tu Cita</h4>
                         <Badge variant="default">Por Confirmar</Badge>
                    </div>
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Estilista:</span>
                    {selectedStylist?.name}
                  </p>
                  <p className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Servicio:</span>
                    {selectedService?.name}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Fecha y Hora:</span>
                    {format(selectedSlot, "eeee, d 'de' MMMM 'a las' HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>

                <CardFooter className="flex-col-reverse sm:flex-row gap-2 px-0 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    Elegir otro horario
                  </Button>
                  <Button
                    onClick={confirmAppointment}
                    className="w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Confirmar Mi Cita
                  </Button>
                </CardFooter>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-4 py-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">¡Cita Agendada!</h3>
                  <p className="text-muted-foreground">
                      Hemos agendado tu cita. Puedes ver los detalles en la sección "Mis Citas".
                  </p>
                 <CardFooter className="px-0 pt-4">
                    <Button className="w-full" onClick={resetFlow}>
                        Agendar otra cita
                    </Button>
                 </CardFooter>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
