'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { add, format, parse, set } from 'date-fns';
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
import { useCollection } from '@/firebase/firestore/use-collection';
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
  const [step, setStep] = React.useState(1);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [availableSlots, setAvailableSlots] = React.useState<Date[]>([]);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useAuth(); // Correctly placed hook call

  const appointmentsCollection = React.useMemo(
    () => (firestore ? collection(firestore, 'admin_appointments') : null),
    [firestore]
  );
  
  const { data: appointments } = useCollection<Appointment>(appointmentsCollection);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    },
  });

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

  const findAvailableSlots = (values: FormValues) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Debes iniciar sesión",
            description: "Para buscar horarios disponibles, por favor inicia sesión o crea una cuenta primero.",
        });
        return;
    }
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

    const dayOfWeek = getDayOfWeek(preferredDate);
    const availabilityForDay = stylist.availability[dayOfWeek] || [];

    const existingAppointments = (appointments || []).filter((app) => {
      const appDate = app.start instanceof Date ? app.start : app.start.toDate();
      return (
        app.stylistId === stylistId &&
        format(appDate, 'yyyy-MM-dd') === format(preferredDate, 'yyyy-MM-dd') &&
        app.status !== 'cancelled'
      );
    });

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
            title: "Error de autenticación",
            description: "No se pudo verificar tu sesión. Por favor, inicia sesión de nuevo.",
        });
        return;
    }
    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) return;

    setIsCalculating(true);
    try {
      const customerId = user.uid;
      const customerName = user.displayName || user.email || 'Cliente';

      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });

      const newAppointmentData: Omit<Appointment, 'id'> = {
        customerName: customerName,
        customerId: customerId,
        serviceId: values.serviceId,
        stylistId: values.stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'scheduled',
      };
      
      const batch = writeBatch(firestore);

      const mainAppointmentRef = doc(collection(firestore, 'admin_appointments'));
      batch.set(mainAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });
      
      const stylistAppointmentRef = doc(firestore, 'stylists', values.stylistId, 'appointments', mainAppointmentRef.id);
      batch.set(stylistAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });

      const customerAppointmentRef = doc(firestore, 'customers', customerId, 'appointments', mainAppointmentRef.id);
      batch.set(customerAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });
      
      await batch.commit();

      toast({
        title: '¡Cita Agendada!',
        description: `Tu cita ha sido agendada para el ${format(
          startDate,
          "eeee, d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )}. Recibirás una confirmación pronto.`,
      });

      setStep(1);
      form.reset();

    } catch (error) {
      console.error('Error creating appointment: ', error);
      toast({
        title: 'Error al Agendar',
        description:
          'No se pudo crear la cita. Revisa la consola para más detalles.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      {step === 1 && (
        <>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Reserva tu Cita</CardTitle>
            <CardDescription>
              Elige tu servicio y estilista para encontrar un horario disponible.
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
                <Button type="submit" disabled={isCalculating} className="w-full" size="lg">
                  {isCalculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    'Ver Horarios Disponibles'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </>
      )}

      {step === 2 && (
        <>
          <CardHeader>
             <CardTitle className="font-headline text-3xl">Elige un Horario</CardTitle>
             <CardDescription>
              Selecciona uno de los horarios disponibles para confirmar tu cita.
            </CardDescription>
          </CardHeader>
           <CardContent className="space-y-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
              <h4 className="font-semibold">Resumen de tu Selección</h4>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep(1);
                setAvailableSlots([]);
              }}
              className="w-full"
            >
              Volver y Cambiar Selección
            </Button>
          </CardContent>
        </>
      )}
    </Card>
  );
}
