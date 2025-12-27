'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Loader2, Calendar as CalendarIcon, User, Send } from 'lucide-react';
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
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';

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
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      preferredDate: new Date(),
    }
  });
  
  const fetchMyAppointments = useCallback(async () => {
    if (!firestore || !user) return;
    setIsLoadingAppointments(true);
    try {
      const q = query(collection(firestore, `customers/${user.uid}/appointments`));
      const querySnapshot = await getDocs(q);
      const userAppointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setMyAppointments(userAppointments.filter(a => a.status !== 'cancelled').sort((a,b) => (a.start as Timestamp).toDate().getTime() - (b.start as Timestamp).toDate().getTime()));
    } catch (error) {
      console.error("Error fetching user appointments:", error);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [firestore, user]);

  useEffect(() => {
    if(user) {
        fetchMyAppointments();
    } else {
        setMyAppointments([]);
        setIsLoadingAppointments(false);
    }
  }, [user, fetchMyAppointments]);


  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = getDay(date);
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  };

  const findAvailableSlots = async () => {
    const { serviceId, stylistId, preferredDate } = form.getValues();
    if (!serviceId || !stylistId || !preferredDate || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description: 'Por favor, completa todos los campos del cliente, servicio y estilista.'
      });
      return;
    }

    setIsCalculating(true);
    setAvailableSlots([]);

    const service = services.find(s => s.id === serviceId);
    const stylist = stylists.find(s => s.id === stylistId);

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
    
    const startOfDay = set(preferredDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    const endOfDay = set(preferredDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });

    const appointmentsQuery = query(
      collection(firestore, 'admin_appointments'),
      where('stylistId', '==', stylistId),
      where('start', '>=', startOfDay),
      where('start', '<=', endOfDay)
    );
    
    const querySnapshot = await getDocs(appointmentsQuery);

    const existingAppointments = querySnapshot.docs
      .map(doc => doc.data() as Appointment)
      .filter(app => app.status !== 'cancelled');
    
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
    if (!firestore || !user || !user.displayName) return;
    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) return;

    setIsSubmitting(true);
    try {
      const customerId = user.uid;
      const customerName = user.displayName;

      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });
      
      const appointmentData = {
        customerName,
        customerId,
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

      const customerAppointmentRef = doc(firestore, 'customers', customerId, 'appointments', appointmentId);
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
      fetchMyAppointments();
      setStep(1);

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

  const handleCancelAppointment = async (appointment: Appointment) => {
    setIsSubmitting(true);
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
            fetchMyAppointments();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo cancelar la cita. Inténtalo de nuevo."
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  if (isUserLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!user) {
     return (
        <Card className="max-w-4xl mx-auto text-center">
            <CardHeader>
                <CardTitle className="font-headline text-3xl">Inicia Sesión para Agendar</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Para poder agendar una cita, necesitas iniciar sesión o crear una cuenta. ¡Es rápido y fácil!</p>
                <div className="mt-4">
                    {/** The UserAuth component will handle login/signup */}
                </div>
            </CardContent>
        </Card>
     )
  }

  return (
    <div className="grid md:grid-cols-5 gap-8 max-w-6xl mx-auto">
        <div className="md:col-span-3">
             <Card>
                <CardHeader>
                <CardTitle className="font-headline text-3xl flex items-center gap-2">
                    {step === 1 ? 'Agendar Nueva Cita' : 'Elige un Horario'}
                </CardTitle>
                <CardDescription>
                    {step === 1
                    ? 'Completa los detalles para encontrar un horario disponible.'
                    : 'Estos son los horarios disponibles. Elige uno para confirmar.'}
                </CardDescription>
                </CardHeader>
                <CardContent>
                {step === 1 && (
                    <Form {...form}>
                    <form
                        className="space-y-6"
                        onSubmit={form.handleSubmit(findAvailableSlots)}
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
                                    value={field.value}
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
                                    value={field.value}
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
                                <FormLabel>Fecha Deseada</FormLabel>
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
                        <Button type="submit" disabled={isCalculating} className="w-full">
                            {isCalculating ? (
                                <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Buscando...
                                </>
                            ) : (
                                'Ver Horarios Disponibles'
                            )}
                        </Button>
                    </form>
                    </Form>
                )}

                {step === 2 && (
                <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 text-card-foreground shadow-sm p-4 space-y-2">
                    <h4 className="font-semibold">Resumen</h4>
                    <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                        <p>
                        <strong>Cliente:</strong> {user.displayName}
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

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                        setStep(1);
                        }}
                    >
                        Volver
                    </Button>
                </div>
                )}
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-3xl flex items-center gap-2">
                        <User /> Mis Citas
                    </CardTitle>
                    <CardDescription>Aquí puedes ver tus próximas citas agendadas.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingAppointments ? (
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : myAppointments.length > 0 ? (
                         <ul className="space-y-4">
                            {myAppointments.map(app => {
                                const service = services.find(s => s.id === app.serviceId);
                                const stylist = stylists.find(s => s.id === app.stylistId);
                                const appDate = (app.start as Timestamp).toDate();
                                return (
                                    <li key={app.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div className="space-y-1">
                                            <p className="font-semibold">{service?.name || 'Servicio no encontrado'}</p>
                                            <p className="text-sm text-muted-foreground">Con: {stylist?.name || 'Estilista no encontrado'}</p>
                                            <p className="text-sm text-muted-foreground">{format(appDate, "eeee, dd 'de' MMMM, HH:mm", {locale: es})}</p>
                                        </div>
                                        <div className="flex flex-col sm:items-end gap-2">
                                            <Badge variant={app.status === 'confirmed' ? 'default' : 'secondary'} className="capitalize">
                                                {app.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                                            </Badge>
                                             <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => handleCancelAppointment(app)}
                                                disabled={isSubmitting}
                                             >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Cancelar'}
                                            </Button>
                                        </div>
                                    </li>
                                )
                            })}
                         </ul>
                    ) : (
                         <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <Send className="w-8 h-8 mb-2"/>
                            <p>Aún no tienes citas agendadas.</p>
                            <p className="text-xs">Usa el formulario para reservar tu primera cita.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
