'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2,
  Calendar as CalendarIcon,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
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
import { useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  Timestamp,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

interface PublicBookingFormProps {
  services: Service[];
  stylists: Stylist[];
}

const formSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar un estilista.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function PublicBookingForm({
  services,
  stylists,
}: PublicBookingFormProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useAuth(); // Moved hook call to the top level

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

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetDialog();
    }
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

  const findAvailableSlots = async (values: FormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Debes iniciar sesión',
        description:
          'Para buscar horarios y agendar una cita, necesitas iniciar sesión o crear una cuenta.',
      });
      return;
    }

    setIsCalculating(true);
    setAvailableSlots([]);
    const { preferredDate, stylistId, serviceId } = values;

    const stylist = stylists.find((s) => s.id === stylistId);
    const service = services.find((s) => s.id === serviceId);

    if (!stylist || !service || !firestore) {
      toast({
        title: 'Error',
        description: 'Estilista, servicio o conexión no válida.',
        variant: 'destructive',
      });
      setIsCalculating(false);
      return;
    }

    const dayOfWeek = getDayOfWeek(preferredDate);
    const availabilityForDay = stylist.availability[dayOfWeek] || [];

    // Fetch existing appointments for the selected stylist on the selected date
    let existingAppointments: Appointment[] = [];
    try {
      const stylistAppointmentsRef = collection(
        firestore,
        'stylists',
        stylistId,
        'appointments'
      );
      const q = query(
        stylistAppointmentsRef,
        where(
          'start',
          '>=',
          Timestamp.fromDate(set(preferredDate, { hours: 0, minutes: 0, seconds: 0 }))
        ),
        where(
          'start',
          '<=',
          Timestamp.fromDate(set(preferredDate, { hours: 23, minutes: 59, seconds: 59 }))
        )
      );
      const querySnapshot = await getDocs(q);
      existingAppointments = querySnapshot.docs.map(
        (doc) => doc.data() as Appointment
      );
    } catch (error) {
      console.error('Error fetching stylist appointments:', error);
      toast({
        title: 'Error de Red',
        description:
          'No se pudieron cargar las citas existentes. Revisa tu conexión e inténtalo de nuevo.',
        variant: 'destructive',
      });
      setIsCalculating(false);
      return;
    }

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
          const existingStart = existingApp.start.toDate();
          const existingEnd = existingApp.end.toDate();
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
          'No se encontraron horarios disponibles para este estilista en la fecha seleccionada. Prueba con otra fecha o estilista.',
      });
    }

    setIsCalculating(false);
    setStep(2);
  };

  const selectSlot = async (slot: Date) => {
    if (!firestore || !user) {
      toast({
        title: 'Error de Autenticación',
        description: 'Debes iniciar sesión para agendar una cita.',
        variant: 'destructive',
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

      // Create a unique ID for the new appointment
      const mainAppointmentRef = doc(collection(firestore, 'admin_appointments'));
      const newId = mainAppointmentRef.id;

      // 1. Write to admin_appointments (will fail if not admin, but we catch it)
      batch.set(doc(firestore, 'admin_appointments', newId), { ...newAppointmentData, id: newId });

      // 2. Write to stylist's subcollection
      batch.set(doc(firestore, 'stylists', values.stylistId, 'appointments', newId), { ...newAppointmentData, id: newId });

      // 3. Write to customer's subcollection
      batch.set(doc(firestore, 'customers', customerId, 'appointments', newId), { ...newAppointmentData, id: newId });

      await batch.commit();

      toast({
        title: '¡Cita Agendada!',
        description: `Tu cita para el ${format(
          startDate,
          "eeee, d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )} está pendiente de confirmación.`,
      });

      handleOpenChange(false);
    } catch (error) {
      console.error('Error creating appointment: ', error);
      // Check if it's a permission error, which is expected for non-admin users writing to admin_appointments
      if (
        (error as any).code === 'permission-denied' ||
        (error as any).code === 'failed-precondition'
      ) {
        toast({
          title: 'Error de Permisos',
          description:
            'Tu cuenta no tiene permiso para realizar esta acción. Contacta al administrador.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error al Agendar',
          description:
            'No se pudo crear la cita. Revisa la consola para más detalles.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Card className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl shadow-lg">
        <div className="grid md:grid-cols-2">
          <div className="p-8 space-y-4">
            <h3 className="font-headline text-2xl font-semibold">
              Agenda tu Cita
            </h3>
            <p className="text-muted-foreground">
              Elige tu servicio y estilista, y encuentra el momento perfecto
              para ti.
            </p>
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(findAvailableSlots)}
              >
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
                <Button type="submit" className="w-full" disabled={isCalculating || !user}>
                  {isCalculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    'Ver Horarios Disponibles'
                  )}
                </Button>
                 {!user && (
                    <p className="text-xs text-center text-destructive flex items-center gap-2">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>Debes iniciar sesión para buscar horarios.</span>
                    </p>
                )}
              </form>
            </Form>
          </div>
          <div className="bg-muted/30 p-8 flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                Horarios Disponibles
              </DialogTitle>
              <DialogDescription>
                Elige un horario para confirmar tu cita.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 mt-4">
              {isCalculating ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                </div>
              ) : availableSlots.length > 0 ? (
                <>
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2 mb-4 text-sm">
                    <div className="flex justify-between items-center">
                      <p>
                        <strong>Servicio:</strong> {selectedService?.name}
                      </p>
                       <Badge variant="secondary">{selectedStylist?.name}</Badge>
                    </div>
                     <p>
                      <strong>Fecha:</strong>{' '}
                      {form.getValues('preferredDate')
                        ? format(form.getValues('preferredDate'), 'PPP', {
                            locale: es,
                          })
                        : ''}
                    </p>
                   
                  </div>
                  <ScrollArea className="h-72 pr-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableSlots.map((slot, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => selectSlot(slot)}
                          disabled={isCalculating}
                          className="w-full"
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
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center p-4">
                  <Sparkles className="h-10 w-10 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">
                    Busca un horario
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Completa el formulario para ver los horarios disponibles.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <DialogContent className="sm:max-w-md md:max-w-4xl p-0 border-0">
        {/* Empty DialogContent, logic moved to the card itself */}
      </DialogContent>
    </Dialog>
  );
}
