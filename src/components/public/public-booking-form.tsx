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
  FormDescription,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { suggestAppointment } from '@/ai/flows/appointment-suggestions';
import {
  Loader2,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  User,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, DayOfWeek } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
import { collection, Timestamp } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useCollection } from '@/firebase/firestore/use-collection';

const formSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un servicio.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
  customerName: z.string().min(2, 'Tu nombre es requerido.'),
  customerEmail: z.string().email('El correo electrónico no es válido.').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

type Suggestion = {
  stylistId: string;
  startTime: string;
  endTime: string;
};


export default function PublicBookingForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();
  const { services } = useServices();
  const { stylists } = useStylists();
  const firestore = useFirestore();

  const appointmentsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'admin/appointments/appointments');
  }, [firestore]);

  const { data: appointments } = useCollection<Appointment>(appointmentsCollectionRef);

  // Safely manage state to avoid hydration mismatch
  useEffect(() => {
    // Any logic that needs to run only on the client can go here
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceIds: [],
      customerName: '',
      customerEmail: '',
    },
  });

  const resetForm = () => {
    form.reset();
    setStep(1);
    setIsLoading(false);
    setSuggestions([]);
  };

  const findSuggestions = async (values: FormValues) => {
    setIsLoading(true);
    setSuggestions([]);
    
    if (!appointments) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron cargar las citas existentes. Intenta de nuevo.',
        });
        setIsLoading(false);
        return;
    }

    const selectedServices = services.filter((s) => values.serviceIds.includes(s.id));
    if (selectedServices.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Servicio no encontrado.',
      });
      setIsLoading(false);
      return;
    }

    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
    const serviceNames = selectedServices.map(s => s.name).join(', ');

    const formattedDate = format(values.preferredDate, 'yyyy-MM-dd');
    const existingAppointmentsForDate = appointments
      .filter((a) => {
          const appDate = a.start instanceof Timestamp ? a.start.toDate() : new Date(a.start as any);
          return format(appDate, 'yyyy-MM-dd') === formattedDate
        })
      .map((a) => {
        const startDate = a.start instanceof Timestamp ? a.start.toDate() : new Date(a.start as any);
        const endDate = a.end instanceof Timestamp ? a.end.toDate() : new Date(a.end as any);
        return {
          stylistId: a.stylistId,
          start: format(startDate, 'HH:mm'),
          end: format(endDate, 'HH:mm'),
        }
      });
      
    const dayIndex = values.preferredDate.getDay();
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[dayIndex];

    try {
      const result = await suggestAppointment({
        service: serviceNames,
        duration: totalDuration,
        preferredDate: formattedDate,
        stylistAvailability: stylists.map((s) => ({
          stylistId: s.id,
          availableTimes: s.availability[dayOfWeek] || [],
        })),
        existingAppointments: existingAppointmentsForDate,
      });

      if (result && result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
        setStep(2);
      } else {
        toast({
          title: 'No hay disponibilidad',
          description:
            'No se encontraron horarios disponibles. Por favor, intenta con otra fecha.',
        });
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error del Asistente IA',
        description:
          'No se pudieron obtener las sugerencias. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    if (!firestore) return;
    const values = form.getValues();
    const selectedServices = services.filter(s => values.serviceIds.includes(s.id));
    const serviceId = selectedServices.length > 0 ? selectedServices[0].id : '';

    const [startHours, startMinutes] = suggestion.startTime.split(':').map(Number);
    const startDate = new Date(values.preferredDate);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const [endHours, endMinutes] = suggestion.endTime.split(':').map(Number);
    const endDate = new Date(values.preferredDate);
    endDate.setHours(endHours, endMinutes, 0, 0);

    const newAppointment: Omit<Appointment, 'id'> = {
      customerName: values.customerName.trim(),
      serviceId: serviceId,
      stylistId: suggestion.stylistId,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      status: 'scheduled',
    };
    
    const appointmentsCollection = collection(firestore, 'admin', 'appointments', 'appointments');
    addDocumentNonBlocking(appointmentsCollection, newAppointment);
    
    // This is a mock customer id for public booking
    const customerId = `public_${Date.now()}`;
    const customerAppointmentsCollection = collection(firestore, 'customers', customerId, 'appointments');
    addDocumentNonBlocking(customerAppointmentsCollection, newAppointment);

    const stylistAppointmentsCollection = collection(firestore, 'stylists', suggestion.stylistId, 'appointments');
    addDocumentNonBlocking(stylistAppointmentsCollection, newAppointment);

    toast({
      title: '¡Cita Agendada!',
      description: `¡Gracias, ${newAppointment.customerName}! Tu cita ha sido agendada para el ${format(
        startDate,
        "eeee, d 'de' MMMM 'a las' HH:mm",
        { locale: es }
      )}.`,
    });

    resetForm();
  };

  const selectedServices = services.filter((s) =>
    form.watch('serviceIds').includes(s.id)
  );

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex items-center gap-2 text-primary">
            <Sparkles className="h-6 w-6" />
        </div>
        <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Agenda tu Cita con IA
        </CardTitle>
        <CardDescription className="text-foreground/80 md:text-xl">
          Deja que nuestro asistente inteligente encuentre el momento perfecto para ti.
        </CardDescription>
      </CardHeader>
      
      {step === 1 ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(findSuggestions)}>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tu Nombre</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Ana García" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tu Correo Electrónico</FormLabel>
                        <FormControl>
                            <Input placeholder="tu@correo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceIds"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Servicio(s)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'w-full justify-between',
                                !field.value.length && 'text-muted-foreground'
                              )}
                            >
                              <span className="truncate">
                                {selectedServices.length > 0
                                  ? selectedServices.map((s) => s.name).join(', ')
                                  : 'Selecciona uno o más servicios'}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar servicio..." />
                            <CommandEmpty>No se encontró el servicio.</CommandEmpty>
                            <CommandGroup>
                              <CommandList>
                                {services.map((service) => (
                                  <CommandItem
                                    value={service.name}
                                    key={service.id}
                                    onSelect={() => {
                                      const currentValues = form.getValues('serviceIds');
                                      const newValues = currentValues.includes(service.id)
                                        ? currentValues.filter((id) => id !== service.id)
                                        : [...currentValues, service.id];
                                      form.setValue('serviceIds', newValues, { shouldValidate: true });
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        field.value.includes(service.id) ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    {service.name}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Puedes seleccionar múltiples servicios.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferredDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Preferida</FormLabel>
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
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando Horarios...
                  </>
                ) : (
                  'Buscar Disponibilidad'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      ) : (
        <>
            <CardContent className="space-y-4">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                    <h4 className="font-semibold">Resumen de tu Solicitud</h4>
                    <div className='text-sm'>
                    <p><strong>Nombre:</strong> {form.getValues('customerName')}</p>
                    <p><strong>Fecha:</strong> {format(form.getValues('preferredDate'), 'PPP', { locale: es })}</p>
                    <div><strong>Servicios:</strong>
                        <div className='flex flex-wrap gap-1 mt-1'>
                            {selectedServices.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                        </div>
                    </div>
                    </div>
                </div>

                <h3 className="text-md font-medium pt-4 text-center">
                  Horarios Sugeridos por la IA
                </h3>
                <ScrollArea className="h-64 pr-4">
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => {
                      const stylist = stylists.find(
                        (s) => s.id === suggestion.stylistId
                      );
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border bg-accent/50"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-semibold">
                              <Clock className="h-4 w-4" />
                              <span>
                                {suggestion.startTime} - {suggestion.endTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>
                                con {stylist?.name || 'Estilista'}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => selectSuggestion(suggestion)}
                          >
                            Agendar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
            </CardContent>
            <CardFooter>
                <Button
                    type="button"
                    variant="outline"
                    className='w-full'
                    onClick={() => setStep(1)}
                  >
                    Volver y cambiar detalles
                </Button>
            </CardFooter>
        </>
      )}
    </Card>
  );
}
