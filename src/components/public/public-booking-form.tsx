
'use client';

import * as React from 'react';
import { Card, CardHeader, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { format, add, set, getDay, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Service, Stylist, DayOfWeek, Appointment } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar una estilista.'),
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
  const { user } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [step, setStep] = React.useState(1);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availableSlots, setAvailableSlots] = React.useState<Date[]>([]);
  
  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'admin_appointments');
  }, [firestore]);

  const { data: allAppointments } = useCollection(appointmentsCollection);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    },
  });

  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = getDay(date);
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  };

  const handleFindSlots = async (values: FormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Inicia Sesión para Continuar',
        description: 'Debes iniciar sesión o crear una cuenta para ver los horarios disponibles.',
      });
      return;
    }
    
    if (!allAppointments) {
      toast({
        variant: 'destructive',
        title: 'Error de Datos',
        description: 'No se pudieron cargar los datos de citas. Inténtalo de nuevo más tarde.',
      });
      return;
    }

    setIsCalculating(true);
    setAvailableSlots([]);

    const { serviceId, stylistId, preferredDate } = values;
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

        currentTime = add(currentTime, { minutes: 15 });
      }
    });
    
    setAvailableSlots(slots);
    setIsCalculating(false);
    setStep(2);
  };
  
  const handleSelectSlot = async (slot: Date) => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para agendar.' });
        return;
    }
    
    const values = form.getValues();
    const service = services.find(s => s.id === values.serviceId);
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
            status: 'scheduled', // Client bookings need confirmation
        };

        const batch = writeBatch(firestore);

        const mainAppointmentRef = doc(collection(firestore, 'admin_appointments'));
        batch.set(mainAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });

        const stylistAppointmentRef = doc(collection(firestore, 'stylists', values.stylistId, 'appointments', mainAppointmentRef.id));
        batch.set(stylistAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });

        const customerAppointmentRef = doc(collection(firestore, 'customers', user.uid, 'appointments', mainAppointmentRef.id));
        batch.set(customerAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });
        
        await batch.commit();

        toast({
            title: '¡Solicitud de Cita Enviada!',
            description: `Recibirás una confirmación pronto. Tu cita para el ${format(startDate, "eeee, d 'de' MMMM 'a las' HH:mm", {locale: es})} ha sido solicitada.`,
        });

        form.reset();
        setStep(1);

    } catch (error) {
        console.error("Error creating appointment:", error);
        toast({ variant: 'destructive', title: 'Error al Agendar', description: 'No se pudo crear la solicitud de cita.' });
    } finally {
        setIsSubmitting(false);
    }
  };


  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);


  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Agenda tu Cita</CardTitle>
        <CardDescription>
          {step === 1 ? 'Elige tu servicio, estilista y fecha para ver los horarios disponibles.' : 'Selecciona un horario para confirmar tu cita.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
           <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFindSlots)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Servicio</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Elige un servicio" />
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
                  <FormItem className="w-full">
                    <FormLabel>Estilista</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Elige una estilista" />
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
                    <FormItem className="flex flex-col w-full">
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
              <Button type="submit" className="w-full" disabled={isCalculating}>
                {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ver Horarios
              </Button>
            </form>
           </Form>
        )}
        {step === 2 && (
            <div className="space-y-4">
                 <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                    <h4 className="font-semibold">Resumen de tu Cita</h4>
                    <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                        <p><strong>Fecha:</strong> {form.getValues('preferredDate') ? format(form.getValues('preferredDate'), 'PPP', { locale: es }) : ''}</p>
                        <p><strong>Cliente:</strong> {user?.displayName || user?.email}</p>
                        <div><strong>Servicio:</strong> <Badge variant="secondary">{selectedService?.name}</Badge></div>
                        <div><strong>Estilista:</strong> <Badge variant="secondary">{selectedStylist?.name}</Badge></div>
                    </div>
                 </div>

                 <h3 className="text-md font-medium pt-4">Horarios Disponibles</h3>
                {isCalculating ? (
                    <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : availableSlots.length > 0 ? (
                    <ScrollArea className="h-64 pr-4">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map((slot, index) => (
                            <Button key={index} variant="outline" onClick={() => handleSelectSlot(slot)} disabled={isSubmitting}>
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
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
