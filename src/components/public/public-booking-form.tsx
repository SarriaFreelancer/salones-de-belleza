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
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, Timestamp } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '../ui/skeleton';


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

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'admin_appointments');
  }, [firestore]);

  const { data: appointments } = useCollection<Appointment>(appointmentsCollection);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceIds: [],
      customerName: '',
      customerEmail: '',
    },
  });

  if (!isClient || !firestore) {
    return (
      <Card className="w-full mx-auto max-w-3xl">
        <CardHeader className="text-center">
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto mt-2" />
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </CardContent>
        <CardFooter>
            <Skeleton className="h-10 w-48 mx-auto" />
        </CardFooter>
      </Card>
    )
  }

  const findSuggestions = async (values: FormValues) => {
    setIsLoading(true);
    setSuggestions([]);
    
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
    const existingAppointmentsForDate = (appointments || [])
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
            'No se encontraron horarios disponibles con los criterios seleccionados. Por favor, intenta con otra fecha o servicio.',
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
    
    const appointmentsCollection = collection(firestore, 'admin_appointments');
    addDocumentNonBlocking(appointmentsCollection, newAppointment);
    
    // This is a mock customer id, in a real app this would come from an authenticated user
    const customerAppointmentsCollection = collection(firestore, 'customers', 'public_customer', 'appointments');
    addDocumentNonBlocking(customerAppointmentsCollection, newAppointment);

    const stylistAppointmentsCollection = collection(firestore, 'stylists', suggestion.stylistId, 'appointments');
    addDocumentNonBlocking(stylistAppointmentsCollection, newAppointment);

    toast({
      title: '¡Cita Agendada!',
      description: `Se ha agendado a ${
        newAppointment.customerName
      } el ${format(
        startDate,
        "eeee, d 'de' MMMM 'a las' HH:mm",
        { locale: es }
      )}.`,
    });

    form.reset();
    setStep(1);
  };

   const selectedServices = services.filter((s) =>
    form.watch('serviceIds').includes(s.id)
  );

  return (
    <Card className="w-full mx-auto max-w-3xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(findSuggestions)}>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-3xl flex items-center justify-center gap-2">
              <Sparkles className="text-primary" /> Agenda tu Cita
            </CardTitle>
            <CardDescription>
              Usa nuestro asistente de IA para encontrar el momento perfecto.
            </CardDescription>
          </CardHeader>
          
          {step === 1 && (
            <>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <FormLabel>Tu Correo (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="tu@correo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="serviceIds"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Servicios</FormLabel>
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
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto mx-auto">
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
            </>
          )}
        </form>
      </Form>
      
      {step === 2 && (
        <>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-accent/50 p-4 space-y-2">
              <h4 className="font-semibold text-center">Resumen de tu Solicitud</h4>
              <div className='text-sm grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <p><strong>Cliente:</strong> {form.getValues('customerName')}</p>
                <p><strong>Fecha:</strong> {format(form.getValues('preferredDate'), 'PPP', { locale: es })}</p>
                <div className="sm:col-span-2"><strong>Servicios:</strong>
                  <div className='flex flex-wrap gap-1 mt-1'>
                    {selectedServices.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-md font-medium text-center pt-4">
              Horarios Sugeridos por la IA
            </h3>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => {
                  const stylist = stylists.find((s) => s.id === suggestion.stylistId);
                  return (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-lg border bg-background"
                    >
                      <div className="flex flex-col gap-1 mb-2 sm:mb-0">
                        <div className="flex items-center gap-2 font-semibold">
                          <Clock className="h-4 w-4" />
                          <span>{suggestion.startTime} - {suggestion.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>con {stylist?.name || 'Estilista desconocido'}</span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => selectSuggestion(suggestion)}>
                        Agendar este Horario
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
              onClick={() => setStep(1)}
              className="w-full md:w-auto mx-auto"
            >
              Modificar Solicitud
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
