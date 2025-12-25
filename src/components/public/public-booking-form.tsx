'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { add, format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Service, Stylist, DayOfWeek, Appointment } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { suggestAppointment } from '@/ai/flows/appointment-suggestions';
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

const formSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
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
  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<
    {
      stylistId: string;
      startTime: string;
      endTime: string;
    }[]
  >([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = date.getDay();
    const days: DayOfWeek[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ];
    return days[dayIndex];
  };

  const handleFindSlots = async (values: FormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Inicia Sesión',
        description: 'Debes iniciar sesión o crear una cuenta para buscar horarios.',
      });
      return;
    }
    setIsCalculating(true);
    setAvailableSlots([]);

    const { preferredDate, serviceId } = values;
    const selectedService = services.find((s) => s.id === serviceId);

    if (!selectedService) {
      toast({ variant: 'destructive', title: 'Error', description: 'Servicio no encontrado.' });
      setIsCalculating(false);
      return;
    }

    try {
      // 1. Get availability for all stylists for the selected day
      const dayOfWeek = getDayOfWeek(preferredDate);
      const stylistAvailability = stylists.map(stylist => ({
        stylistId: stylist.id,
        availableTimes: stylist.availability[dayOfWeek] || [],
      }));

      // 2. Get existing appointments for that day
      const dayStart = new Date(preferredDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(preferredDate);
      dayEnd.setHours(23, 59, 59, 999);

      const appointmentsRef = collection(firestore, 'admin_appointments');
      const q = query(appointmentsRef, where('start', '>=', dayStart), where('start', '<=', dayEnd));
      const querySnapshot = await getDocs(q);
      const existingAppointments = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const startTime = (data.start as Timestamp).toDate();
        const endTime = (data.end as Timestamp).toDate();
        return {
          stylistId: data.stylistId,
          start: format(startTime, 'HH:mm'),
          end: format(endTime, 'HH:mm'),
        };
      });

      // 3. Call the AI flow
      const result = await suggestAppointment({
        service: selectedService.name,
        duration: selectedService.duration,
        preferredDate: format(preferredDate, 'yyyy-MM-dd'),
        stylistAvailability,
        existingAppointments,
      });

      if (result.suggestions.length > 0) {
        setAvailableSlots(result.suggestions);
        setStep(2);
      } else {
        toast({
          variant: 'destructive',
          title: 'No hay disponibilidad',
          description: 'No se encontraron horarios disponibles para este servicio en la fecha seleccionada. Intenta otro día.',
        });
      }
    } catch (error) {
      console.error("Error finding slots with AI:", error);
      toast({
        variant: 'destructive',
        title: 'Error de la IA',
        description: 'No se pudieron sugerir horarios. Por favor, intenta de nuevo.',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSelectSlot = async (slot: { stylistId: string; startTime: string; endTime: string; }) => {
    if (!user || !user.displayName || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Usuario no autenticado o faltan datos.' });
      return;
    }
    const values = form.getValues();
    
    setIsCalculating(true);
    try {
        const startDate = parse(slot.startTime, 'HH:mm', values.preferredDate);
        const endDate = parse(slot.endTime, 'HH:mm', values.preferredDate);

        const newAppointmentData: Omit<Appointment, 'id'> = {
            customerName: user.displayName,
            customerId: user.uid,
            serviceId: values.serviceId,
            stylistId: slot.stylistId,
            start: Timestamp.fromDate(startDate),
            end: Timestamp.fromDate(endDate),
            status: 'scheduled',
        };

        const batch = writeBatch(firestore);

        const mainAppointmentRef = doc(collection(firestore, 'admin_appointments'));
        batch.set(mainAppointmentRef, newAppointmentData);

        const stylistAppointmentRef = doc(firestore, 'stylists', slot.stylistId, 'appointments', mainAppointmentRef.id);
        batch.set(stylistAppointmentRef, newAppointmentData);
        
        const customerAppointmentRef = doc(firestore, 'customers', user.uid, 'appointments', mainAppointmentRef.id);
        batch.set(customerAppointmentRef, newAppointmentData);

        await batch.commit();

        toast({
            title: '¡Cita Agendada!',
            description: `Tu cita ha sido agendada para el ${format(startDate, "eeee, d 'de' MMMM 'a las' HH:mm", { locale: es })}.`
        });

        setStep(1);
        setAvailableSlots([]);
        form.reset();

    } catch (error) {
        console.error("Error creating appointment:", error);
        toast({
            variant: 'destructive',
            title: 'Error al Agendar',
            description: 'No se pudo crear la cita. Inténtalo de nuevo.'
        });
    } finally {
        setIsCalculating(false);
    }
  };

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl">
      {step === 1 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFindSlots)}>
            <CardHeader>
              <CardTitle className="font-headline text-3xl flex items-center gap-2">
                <Sparkles className="text-primary" />
                Agenda tu Cita con IA
              </CardTitle>
              <CardDescription>
                Elige un servicio y una fecha. Nuestro asistente de IA
                encontrará los mejores horarios y estilistas para ti.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
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
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full md:w-auto ml-auto"
                disabled={isCalculating || !user}
                size="lg"
              >
                {isCalculating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {user ? 'Buscar Horarios Disponibles' : 'Inicia Sesión para Buscar'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      )}
      {step === 2 && (
        <>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">
              Horarios Sugeridos por la IA
            </CardTitle>
            <CardDescription>
              Estos son los mejores horarios que encontramos para ti. ¡Elige
              uno para confirmar tu cita!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2 mb-6">
                <h4 className="font-semibold">Resumen de tu Solicitud</h4>
                <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                    <p>
                        <strong>Cliente:</strong> {user?.displayName || user?.email}
                    </p>
                    <p>
                        <strong>Fecha:</strong>{' '}
                        {form.getValues('preferredDate')
                            ? format(form.getValues('preferredDate'), 'PPP', { locale: es })
                            : ''
                        }
                    </p>
                    <div>
                        <strong>Servicio:</strong>{' '}
                        <Badge variant="secondary">{selectedService?.name}</Badge>
                    </div>
                </div>
            </div>
            <ScrollArea className="h-72 pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableSlots.map((slot, index) => {
                  const stylist = stylists.find(s => s.id === slot.stylistId);
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectSlot(slot)}
                      disabled={isCalculating}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-colors",
                        "hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:outline-none",
                        "disabled:opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">{slot.startTime}</span>
                         {isCalculating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Badge>{stylist?.name}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">con {stylist?.name}</p>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
           <CardFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full md:w-auto ml-auto"
              >
                Volver
              </Button>
            </CardFooter>
        </>
      )}
    </Card>
  );
}

    