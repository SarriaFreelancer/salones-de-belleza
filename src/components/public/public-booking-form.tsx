
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2,
  Calendar as CalendarIcon,
  LogOut,
  UserCircle,
} from 'lucide-react';
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
  query,
  where,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const bookingFormSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar un estilista.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

function UserAppointmentList({
  userId,
  services,
  stylists
}: {
  userId: string;
  services: Service[];
  stylists: Stylist[];
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = React.useState<string | null>(null);

  const myAppointmentsCollection = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return collection(firestore, `customers/${userId}/appointments`);
  }, [firestore, userId]);

  const {
    data: myAppointments,
    isLoading: isLoadingAppointments,
  } = useCollection<Appointment>(myAppointmentsCollection, true);

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!firestore) return;

    setIsCancelling(appointment.id);
    try {
      const batch = writeBatch(firestore);

      const adminRef = doc(firestore, 'admin_appointments', appointment.id);
      batch.update(adminRef, { status: 'cancelled' });

      const stylistRef = doc(
        firestore,
        'stylists',
        appointment.stylistId,
        'appointments',
        appointment.id
      );
      batch.update(stylistRef, { status: 'cancelled' });

      const customerRef = doc(
        firestore,
        'customers',
        userId,
        'appointments',
        appointment.id
      );
      batch.update(customerRef, { status: 'cancelled' });

      await batch.commit();

      toast({
        title: 'Cita Cancelada',
        description: 'Tu cita ha sido cancelada exitosamente.',
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cancelar la cita. Por favor, intenta de nuevo.',
      });
    } finally {
      setIsCancelling(null);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Mis Citas</DialogTitle>
        <DialogDescription>
          Aquí puedes ver y gestionar tus próximas citas.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            {isLoadingAppointments ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : myAppointments && myAppointments.length > 0 ? (
              myAppointments
                .sort((a, b) => (b.start as Timestamp).toDate().getTime() - (a.start as Timestamp).toDate().getTime())
                .map((appointment) => {
                  const service = services.find(
                    (s) => s.id === appointment.serviceId
                  );
                  const stylist = stylists.find(
                    (s) => s.id === appointment.stylistId
                  );
                  const appointmentDate = (appointment.start as Timestamp).toDate();
                  const isPast = appointmentDate < new Date();
                  const isCancelled = appointment.status === 'cancelled';
                  
                  return (
                    <div
                      key={appointment.id}
                      className={cn('rounded-lg border p-4 space-y-2', (isPast || isCancelled) && 'opacity-60 bg-muted/50')}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{service?.name || 'Servicio no encontrado'}</p>
                          <p className="text-sm text-muted-foreground">
                            con {stylist?.name || 'Estilista no encontrada'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            isCancelled
                              ? 'destructive'
                              : appointment.status === 'confirmed'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {isCancelled ? 'Cancelada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(appointmentDate, "eeee, d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                      {!isPast && !isCancelled && (
                        <DialogFooter className='pt-2'>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelAppointment(appointment)}
                            disabled={isCancelling === appointment.id}
                          >
                            {isCancelling === appointment.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Cancelar Cita
                          </Button>
                        </DialogFooter>
                      )}
                    </div>
                  );
                })
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">No tienes citas agendadas.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </DialogContent>
  );
}


export default function PublicBookingForm({ services, stylists }: { services: Service[], stylists: Stylist[]}) {
  const { user, isUserLoading, logout } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [step, setStep] = React.useState(1);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availableSlots, setAvailableSlots] = React.useState<Date[]>([]);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = React.useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    },
  });

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

  const findAvailableSlots = async (values: BookingFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Inicia Sesión',
        description: 'Debes iniciar sesión o crear una cuenta para ver los horarios.',
      });
      return;
    }
    
    if (!firestore) return;

    setIsCalculating(true);
    setAvailableSlots([]);

    const { serviceId, stylistId, preferredDate } = values;

    const service = services.find((s) => s.id === serviceId);
    const stylist = stylists.find((s) => s.id === stylistId);

    if (!service || !stylist) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Servicio o estilista no válido.',
      });
      setIsCalculating(false);
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
    
    // Fetch appointments for the specific stylist on the specific day
    const appointmentsQuery = query(
      collection(firestore, 'stylists', stylistId, 'appointments'),
      where('start', '>=', startOfDay),
      where('start', '<=', endOfDay)
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);

    const existingAppointments = appointmentsSnapshot.docs
        .map(doc => doc.data() as Appointment)
        .filter(app => app.status !== 'cancelled');

    const slots: Date[] = [];
    const serviceDuration = service.duration;

    availabilityForDay.forEach((availSlot) => {
      const baseDate = new Date(preferredDate);
      set(baseDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

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

        currentTime = add(currentTime, { minutes: 15 }); // Check in 15-minute intervals
      }
    });

    setAvailableSlots(slots);
    setIsCalculating(false);
    setStep(2);
  };

  const selectSlot = async (slot: Date) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);

    if (!service) {
      setIsSubmitting(false);
      return;
    }

    try {
      const appointmentId = doc(collection(firestore, 'admin_appointments')).id;
      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });
      
      // The user object contains firstName and lastName from the customer profile
      const customerName = user.displayName || `${user.email}`;

      const appointmentData: Omit<Appointment, 'id'> = {
        customerName: customerName,
        customerId: user.uid,
        serviceId: values.serviceId,
        stylistId: values.stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'scheduled', // Citas agendadas por clientes quedan pendientes de confirmación
      };

      const batch = writeBatch(firestore);

      // Create in admin collection (for admin view)
      const adminAppointmentRef = doc(
        firestore,
        'admin_appointments',
        appointmentId
      );
      batch.set(adminAppointmentRef, { ...appointmentData, id: appointmentId });

      // Create in stylist's subcollection (for availability checks)
      const stylistAppointmentRef = doc(
        firestore,
        'stylists',
        values.stylistId,
        'appointments',
        appointmentId
      );
      batch.set(stylistAppointmentRef, { ...appointmentData, id: appointmentId });

      // Create in customer's subcollection (for 'My Bookings' view)
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
          "eeee d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )}. Recibirás una notificación cuando sea confirmada.`,
      });

      setStep(1); // Reset form
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo agendar la cita. Por favor, intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      <Dialog open={isMyBookingsOpen} onOpenChange={setIsMyBookingsOpen}>
        {user && <UserAppointmentList userId={user.uid} services={services} stylists={stylists} />}
      </Dialog>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
            <div>
                <CardTitle className="font-headline text-3xl">Reserva tu Cita</CardTitle>
                <CardDescription>
                {step === 1
                    ? 'Elige un servicio, estilista y fecha para empezar.'
                    : 'Selecciona uno de los horarios disponibles.'}
                </CardDescription>
            </div>
            {user && (
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    <Button variant="outline" onClick={() => setIsMyBookingsOpen(true)}>
                      <UserCircle className="mr-2" />
                      Mis Citas
                    </Button>
                    <Button variant="ghost" size="icon" onClick={logout}>
                        <LogOut />
                        <span className="sr-only">Cerrar sesión</span>
                    </Button>
                </div>
            )}
        </div>
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
              <Button type="submit" disabled={isCalculating} className="w-full">
                {isCalculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  'Ver Horarios'
                )}
              </Button>
            </form>
          </Form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
              <h4 className="font-semibold">Resumen</h4>
              <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
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
                  No hay horarios disponibles para este día.
                </p>
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
                Atrás
              </Button>
            </DialogFooter>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
