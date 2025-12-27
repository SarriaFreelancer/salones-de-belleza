
'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
import { Loader2, Calendar as CalendarIcon, CheckCircle, UserPlus, LogIn, Repeat, User, X } from 'lucide-react';
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
import type { Appointment, Service, Stylist, DayOfWeek } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useAuth } from '@/hooks/use-auth';
import {
  collection,
  Timestamp,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';

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

export default function PublicBookingForm({ services, stylists }: PublicBookingFormProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const { user, isUserLoading } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    },
  });

  const { data: allAppointments } = useCollection(
    firestore ? collection(firestore, 'admin_appointments') : null
  );

  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = getDay(date);
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  };

  const findAvailableSlots = async () => {
    const { serviceId, stylistId, preferredDate } = form.getValues();
    if (!serviceId || !stylistId || !preferredDate || !allAppointments) {
      return;
    }

    setIsCalculating(true);
    setAvailableSlots([]);

    const service = services.find(s => s.id === serviceId);
    const stylist = stylists.find(s => s.id === stylistId);

    if (!service || !stylist) {
        setIsCalculating(false);
        return;
    }

    const dayOfWeek = getDayOfWeek(preferredDate);
    const availabilityForDay = stylist.availability[dayOfWeek] || [];
    
    const startOfDay = set(preferredDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    const endOfDay = set(preferredDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });

    const existingAppointments = allAppointments.filter(app => 
        app.stylistId === stylistId &&
        (app.start as Timestamp).toDate() >= startOfDay &&
        (app.start as Timestamp).toDate() <= endOfDay &&
        app.status !== 'cancelled'
    );
    
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

        currentTime = add(currentTime, { minutes: 15 }); // Check every 15 minutes for a new slot start
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
        
        const newAppointmentData: Omit<Appointment, 'id'> = {
            customerName: user.displayName || user.email || 'Cliente',
            customerId: user.uid,
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

        const customerAppointmentRef = doc(firestore, 'customers', user.uid, 'appointments', mainAppointmentRef.id);
        batch.set(customerAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });
        
        await batch.commit();

        toast({
            title: '¡Cita Agendada!',
            description: `Tu cita ha sido agendada para el ${format(startDate, "eeee, d 'de' MMMM 'a las' HH:mm", { locale: es })}. Está pendiente de confirmación.`,
            className: 'bg-green-100 text-green-800'
        });

        setStep(3); // Go to confirmation step
    } catch (error) {
        console.error('Error creating appointment: ', error);
        toast({
            title: 'Error al Agendar',
            description: 'No se pudo crear la cita. Por favor, inténtalo de nuevo.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    form.reset({
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    });
    setStep(1);
    setAvailableSlots([]);
  };

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);


  if (isUserLoading) {
    return (
      <Card className="w-full max-w-3xl mx-auto text-center">
        <CardHeader>
          <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
            Cargando...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-12 w-12 mx-auto animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="w-full max-w-3xl mx-auto text-center">
        <CardHeader>
          <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
            Reserva tu Cita
          </CardTitle>
          <CardDescription className="text-xl">
            Para agendar, por favor inicia sesión o crea una cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 justify-center items-center">
             <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span>¿Eres nueva? Regístrate</span>
             </div>
             <div className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                <span>¿Ya tienes cuenta? Inicia Sesión</span>
             </div>
        </CardContent>
        <CardFooter className="justify-center">
             <p className="text-sm text-muted-foreground">Utiliza los botones en la parte superior derecha de la página.</p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      {step === 1 && (
         <>
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
                Reserva tu Cita
                </CardTitle>
                <CardDescription className="text-xl">
                Elige tu servicio, estilista y fecha preferida.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form
                    className="space-y-6"
                    onSubmit={form.handleSubmit(findAvailableSlots)}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                        control={form.control}
                        name="serviceId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-lg">Servicio</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                <SelectTrigger className="h-12">
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
                            <FormLabel className="text-lg">Estilista</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                <SelectTrigger className="h-12">
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
                            <FormLabel className="text-lg">Fecha Deseada</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={'outline'}
                                    className={cn(
                                    'h-12 pl-3 text-left font-normal text-base',
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
                        <Button size="lg" type="submit" className="w-full" disabled={isCalculating}>
                        {isCalculating ? (
                            <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Buscando...
                            </>
                        ) : (
                            'Buscar Horarios Disponibles'
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
                 <Button variant="ghost" size="sm" className="absolute top-4 left-4" onClick={() => setStep(1)}>
                    &larr; Volver
                </Button>
                <div className="text-center pt-8">
                     <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
                        Elige tu Horario
                    </CardTitle>
                    <CardDescription className="text-xl">
                        Selecciona una hora para tu cita.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2 mb-6">
                    <h4 className="font-semibold text-center">Resumen de tu Cita</h4>
                    <div className="text-base grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Servicio:</span>
                            <Badge variant="secondary">{selectedService?.name}</Badge>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="font-medium">Estilista:</span>
                            <Badge variant="secondary">{selectedStylist?.name}</Badge>
                        </div>
                        <div className="flex justify-between items-center sm:col-span-2">
                             <span className="font-medium">Fecha:</span>
                             <Badge variant="secondary"> {form.getValues('preferredDate')
                                ? format(form.getValues('preferredDate'), 'PPP', {
                                    locale: es,
                                })
                                : ''}
                            </Badge>
                        </div>
                    </div>
                </div>

                {isCalculating ? (
                <div className="flex h-40 items-center justify-center">
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
                        className="h-12 text-base"
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
                <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                    <p className="text-muted-foreground p-4">
                    No hay horarios disponibles para {selectedStylist?.name} en la fecha seleccionada.
                    </p>
                </div>
                )}
            </CardContent>
        </>
      )}

      {step === 3 && (
        <>
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 rounded-full p-4 w-20 h-20 flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl pt-4">
                    ¡Cita Agendada!
                </CardTitle>
                <CardDescription className="text-xl">
                    Tu cita está pendiente de confirmación por nuestro equipo.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-lg space-y-2">
                <p>Recibirás una notificación una vez que sea confirmada.</p>
                <p className="text-muted-foreground">Gracias por confiar en Divas A&A.</p>
            </CardContent>
            <CardFooter>
                <Button size="lg" className="w-full" onClick={resetForm}>
                    <Repeat className="mr-2 h-4 w-4" />
                    Agendar otra Cita
                </Button>
            </CardFooter>
        </>
      )}
    </Card>
  );
}

    