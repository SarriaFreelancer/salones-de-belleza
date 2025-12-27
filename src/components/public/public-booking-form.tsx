
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Calendar as CalendarIcon, LogOut, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { add, format, parse, set, getDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, Service, Stylist, DayOfWeek, Customer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useFirestore, useMemoFirebase, useAuth, useUser } from '@/firebase';
import {
  collection,
  Timestamp,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';

const bookingFormSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar una estilista.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface UserAppointmentListProps {
  myAppointments: Appointment[];
  isLoading: boolean;
  onCancel: (appointmentId: string, stylistId: string) => void;
  isCancelling: string | null;
  services: Service[];
  stylists: Stylist[];
}

function UserAppointmentList({ myAppointments, isLoading, onCancel, isCancelling, services, stylists }: UserAppointmentListProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }
    
  if (myAppointments.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>Aún no tienes citas agendadas.</p>
        <p>¡Usa el formulario para reservar tu primera cita!</p>
      </div>
    );
  }
  
  const upcomingAppointments = myAppointments.filter(app => {
      const appDate = app.start instanceof Date ? app.start : app.start.toDate();
      return isBefore(new Date(), appDate) && app.status !== 'cancelled';
  });
  
  const pastAppointments = myAppointments.filter(app => {
      const appDate = app.start instanceof Date ? app.start : app.start.toDate();
      return !isBefore(new Date(), appDate) || app.status === 'cancelled';
  });


  const renderAppointmentCard = (appointment: Appointment, isPast: boolean) => {
    const service = services.find(s => s.id === appointment.serviceId);
    const stylist = stylists.find(s => s.id === appointment.stylistId);
    const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
    
    let statusVariant: 'default' | 'secondary' | 'destructive' = 'secondary';
    if(appointment.status === 'confirmed') statusVariant = 'default';
    if(appointment.status === 'cancelled') statusVariant = 'destructive';

    return (
        <Card key={appointment.id} className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between p-4", isPast && "opacity-60")}>
            <div className="flex-1 space-y-1 mb-4 sm:mb-0">
                <h4 className="font-semibold">{service?.name || 'Servicio Desconocido'}</h4>
                <p className="text-sm text-muted-foreground">
                    Con {stylist?.name || 'Estilista Desconocida'}
                </p>
                <p className="text-sm text-muted-foreground">
                    {format(appointmentDate, "eeee d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Badge variant={statusVariant} className="capitalize w-full justify-center sm:w-auto">
                    {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                </Badge>
                {!isPast && appointment.status !== 'cancelled' && (
                    <Button 
                        variant="outline"
                        size="sm" 
                        onClick={() => onCancel(appointment.id, appointment.stylistId)} 
                        disabled={isCancelling === appointment.id}
                    >
                         {isCancelling === appointment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Cancelar</span>
                    </Button>
                )}
            </div>
        </Card>
    )
  }

  return (
    <div className="space-y-6">
        {upcomingAppointments.length > 0 && (
             <div>
                <h3 className="text-lg font-semibold mb-4">Próximas Citas</h3>
                <div className="space-y-4">
                    {upcomingAppointments.map(app => renderAppointmentCard(app, false))}
                </div>
            </div>
        )}

       {pastAppointments.length > 0 && (
             <div>
                <h3 className="text-lg font-semibold mb-4 pt-6 border-t">Historial de Citas</h3>
                <div className="space-y-4">
                    {pastAppointments.map(app => renderAppointmentCard(app, true))}
                </div>
            </div>
       )}
    </div>
  );
}


export default function PublicBookingForm({ services, stylists }: { services: Service[], stylists: Stylist[]}) {
  const { user, isUserLoading, logout } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [showCancelAlert, setShowCancelAlert] = useState<{ open: boolean; appointmentId: string | null; stylistId: string | null }>({ open: false, appointmentId: null, stylistId: null });


  // Effect to fetch customer profile
  useEffect(() => {
    if (user && firestore) {
      const customerDocRef = doc(firestore, 'customers', user.uid);
      const unsubscribe = onSnapshot(customerDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setCustomerProfile(docSnap.data() as Customer);
        }
      });
      return () => unsubscribe();
    } else {
      setCustomerProfile(null);
    }
  }, [user, firestore]);

  // Effect to fetch user appointments
  useEffect(() => {
    if (user && firestore) {
      setIsLoadingAppointments(true);
      const appointmentsColRef = collection(firestore, 'customers', user.uid, 'appointments');
      const q = query(appointmentsColRef);
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userAppointments = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Appointment));
        setMyAppointments(userAppointments.sort((a,b) => (b.start as Timestamp).toMillis() - (a.start as Timestamp).toMillis()));
        setIsLoadingAppointments(false);
      }, (error) => {
        console.error("Error fetching user appointments:", error);
        setIsLoadingAppointments(false);
      });
      return () => unsubscribe();
    } else {
      setMyAppointments([]);
      setIsLoadingAppointments(false);
    }
  }, [user, firestore]);


  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
        preferredDate: new Date(),
    }
  });

  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = getDay(date);
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  };

  const findAvailableSlots = async (values: BookingFormValues) => {
    const { serviceId, stylistId, preferredDate } = values;

    if (!serviceId || !stylistId || !preferredDate || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description: 'Por favor, completa todos los campos del formulario.',
      });
      return;
    }

    setIsCalculating(true);
    setAvailableSlots([]);

    try {
        const service = services.find(s => s.id === serviceId);
        const stylist = stylists.find(s => s.id === stylistId);

        if (!service || !stylist) {
            toast({ variant: 'destructive', title: 'Error de Datos', description: 'No se pudo encontrar el servicio o estilista seleccionado.' });
            return;
        }

        const dayOfWeek = getDayOfWeek(preferredDate);
        const availabilityForDay = stylist.availability[dayOfWeek] || [];
        
        const startOfDay = set(preferredDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
        const endOfDay = set(preferredDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });

        // Query the specific stylist's appointment subcollection
        const appointmentsColRef = collection(firestore, 'stylists', stylistId, 'appointments');
        const q = query(appointmentsColRef, 
            where('start', '>=', startOfDay), 
            where('start', '<=', endOfDay),
            where('status', '!=', 'cancelled')
        );

        const querySnapshot = await getDocs(q);
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
        setStep(2);
    } catch (error) {
        console.error("Error finding available slots:", error);
        toast({ variant: 'destructive', title: 'Error de Red', description: 'No se pudo verificar la disponibilidad. Inténtalo de nuevo.' });
    } finally {
        setIsCalculating(false);
    }
  };
  
  const selectSlot = async (slot: Date) => {
    if (!firestore || !user || !customerProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para agendar una cita.' });
        return;
    }

    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) return;

    setIsSubmitting(true);
    try {
      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });
      
      const appointmentData = {
        customerName: `${customerProfile.firstName} ${customerProfile.lastName}`,
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
      batch.set({ ...appointmentData, id: appointmentId }, { merge: false });
      
      const stylistAppointmentRef = doc(firestore, 'stylists', values.stylistId, 'appointments', appointmentId);
      batch.set({ ...appointmentData, id: appointmentId }, { merge: false });

      const customerAppointmentRef = doc(firestore, 'customers', user.uid, 'appointments', appointmentId);
      batch.set({ ...appointmentData, id: appointmentId }, { merge: false });
      
      await batch.commit();

      toast({
        title: '¡Pre-Reserva Exitosa!',
        description: `Tu cita ha sido agendada para confirmación el ${format(
          startDate, "eeee, d 'de' MMMM 'a las' HH:mm", { locale: es }
        )}. Recibirás una notificación cuando sea confirmada por el salón.`,
      });

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

  const handleOpenCancelDialog = (appointmentId: string, stylistId: string) => {
    setShowCancelAlert({ open: true, appointmentId, stylistId });
  };
  
  const handleConfirmCancel = async () => {
    const { appointmentId, stylistId } = showCancelAlert;
    if (!appointmentId || !stylistId || !user) return;
    
    setIsCancelling(appointmentId);
    try {
        const result = await cancelAppointment({
            appointmentId,
            customerId: user.uid,
            stylistId,
        });

        if (result.success) {
            toast({
                title: 'Cita Cancelada',
                description: 'Tu cita ha sido cancelada exitosamente.',
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Error cancelling appointment from client:", error);
        toast({
            variant: 'destructive',
            title: 'Error al Cancelar',
            description: 'No se pudo cancelar la cita. Por favor, contacta al salón.',
        });
    } finally {
        setIsCancelling(null);
        setShowCancelAlert({ open: false, appointmentId: null, stylistId: null });
    }
  }


  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  if (!user && !isUserLoading) {
    return (
        <Card className="w-full max-w-2xl mx-auto text-center">
            <CardHeader>
                <CardTitle className="font-headline text-3xl">Agenda tu Cita</CardTitle>
                <CardDescription>
                Para poder agendar una cita o ver tu historial, por favor inicia sesión o crea una cuenta.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* UserAuth is rendered in the main header */}
            </CardContent>
        </Card>
    )
  }

  if (isUserLoading || (user && !customerProfile)) {
      return (
          <Card className="w-full max-w-4xl mx-auto">
              <CardHeader>
                   <Skeleton className="h-8 w-48" />
                   <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                  <Skeleton className="h-64 w-full" />
              </CardContent>
          </Card>
      );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-headline text-3xl">
                Hola, {customerProfile?.firstName || 'Diva'}
              </CardTitle>
              <CardDescription>
                {step === 1 ? 'Elige tu servicio y encuentra un horario disponible.' : 'Confirma el horario para tu cita.'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="mt-4 sm:mt-0">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
            </Button>
          </div>
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
                              <SelectValue placeholder="Selecciona una estilista" />
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
                 <CardFooter className="px-0 pt-6">
                    <Button type="submit" disabled={isCalculating} className="w-full sm:w-auto">
                        {isCalculating ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</>
                        ) : (
                            'Buscar Horarios Disponibles'
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
                  <div>
                    <strong>Fecha:</strong>{' '}
                    {form.getValues('preferredDate')
                      ? format(form.getValues('preferredDate'), 'PPP', {
                          locale: es,
                        })
                      : ''}
                  </div>
                   <div>
                    <strong>Estilista:</strong>{' '}
                    <Badge variant="secondary">{selectedStylist?.name}</Badge>
                  </div>
                  <div className="col-span-2">
                    <strong>Servicio:</strong>{' '}
                    <Badge variant="secondary">{selectedService?.name}</Badge>
                  </div>
                </div>
              </div>

              <h3 className="text-md font-medium pt-4">Selecciona un Horario</h3>
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
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                  <p className="text-muted-foreground">
                    No hay horarios disponibles para {selectedStylist?.name} en este día.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Intenta con otra fecha u otra estilista.</p>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                  }}
                >
                  Volver y Cambiar Selección
                </Button>
              </DialogFooter>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Mis Citas</CardTitle>
          <CardDescription>
            Aquí puedes ver tus próximas citas y tu historial.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <UserAppointmentList 
                myAppointments={myAppointments}
                isLoading={isLoadingAppointments}
                onCancel={handleOpenCancelDialog}
                isCancelling={isCancelling}
                services={services}
                stylists={stylists}
            />
        </CardContent>
      </Card>
      
       <AlertDialog open={showCancelAlert.open} onOpenChange={(open) => !open && setShowCancelAlert({ open: false, appointmentId: null, stylistId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres cancelar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se notificará al salón de tu cancelación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive hover:bg-destructive/90">
              Sí, Cancelar Cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    