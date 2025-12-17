'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import type { Appointment, Service, Stylist, DayOfWeek } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import UserAuth from './user-auth';

const formSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un servicio.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

type Suggestion = {
  stylistId: string;
  startTime: string;
  endTime: string;
};

interface PublicBookingFormProps {
  appointments: Appointment[];
  services: Service[];
  stylists: Stylist[];
}

export default function PublicBookingForm({
  appointments,
  services,
  stylists
}: PublicBookingFormProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceIds: [],
      preferredDate: new Date(),
    },
  });

  const resetForm = () => {
    form.reset({
        serviceIds: [],
        preferredDate: new Date(),
    });
    setStep(1);
    setIsLoading(false);
    setSuggestions([]);
  };

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
    const existingAppointmentsForDate = appointments
      .filter(a => format(a.start instanceof Date ? a.start : a.start.toDate(), 'yyyy-MM-dd') === formattedDate)
      .map((a) => ({
        stylistId: a.stylistId,
        start: format(a.start instanceof Date ? a.start : a.start.toDate(), 'HH:mm'),
        end: format(a.end instanceof Date ? a.end : a.end.toDate(), 'HH:mm'),
      }));
      
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
    if (!firestore || !user) {
        toast({
            variant: 'destructive',
            title: 'Acción Requerida',
            description: 'Debes iniciar sesión para agendar una cita.',
        });
        return;
    };
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
      customerName: user.displayName || user.email || 'Cliente Anónimo',
      customerId: user.uid,
      serviceId: serviceId, // Simplified for now
      stylistId: suggestion.stylistId,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      status: 'scheduled',
    };
    
    const appointmentsCollection = collection(firestore, 'admin_appointments');
    addDocumentNonBlocking(appointmentsCollection, newAppointment);
    
    const customerAppointmentsCollection = collection(firestore, 'customers', newAppointment.customerId, 'appointments');
    addDocumentNonBlocking(customerAppointmentsCollection, newAppointment);

    const stylistAppointmentsCollection = collection(firestore, 'stylists', suggestion.stylistId, 'appointments');
    addDocumentNonBlocking(stylistAppointmentsCollection, newAppointment);

    toast({
      title: '¡Cita Agendada!',
      description: `Se ha agendado tu cita el ${format(
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
  
  if (step === 2) {
      return (
        <Card className="max-w-4xl mx-auto shadow-2xl">
          <CardHeader>
             <div className="flex items-center gap-2">
                <Sparkles className="text-primary h-6 w-6" />
                <CardTitle className="font-headline text-2xl">
                    Elige un Horario
                </CardTitle>
            </div>
            <CardDescription>
                Revisa los detalles y elige una de las sugerencias de nuestro asistente de IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                    <h4 className="font-semibold">Resumen de la Cita</h4>
                    <div className='text-sm'>
                    <p><strong>Fecha:</strong> {form.getValues('preferredDate') ? format(form.getValues('preferredDate'), 'PPP', { locale: es }) : ''}</p>
                    <div><strong>Servicios:</strong>
                        <div className='flex flex-wrap gap-1 mt-1'>
                            {selectedServices.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                        </div>
                    </div>
                    </div>
                </div>

                <h3 className="text-md font-medium pt-4">
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
                                con {stylist?.name || 'Estilista desconocido'}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => selectSuggestion(suggestion)}
                            disabled={!user || isUserLoading}
                          >
                            Agendar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            {!user && !isUserLoading && (
                <div className="w-full p-4 rounded-lg border-l-4 border-primary bg-primary/10">
                    <p className="font-semibold text-primary-foreground">¿Lista para agendar?</p>
                    <p className="text-sm text-primary-foreground/80 mb-2">Inicia sesión o crea una cuenta para confirmar tu cita.</p>
                    <UserAuth />
                </div>
            )}
             <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                >
                Volver y cambiar selección
            </Button>
          </CardFooter>
        </Card>
      )
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2">
            <Sparkles className="text-primary h-6 w-6" />
            <CardTitle className="font-headline text-3xl">
                Agenda tu Cita
            </CardTitle>
        </div>
        <CardDescription>
          Deja que nuestro asistente de IA encuentre el momento perfecto para ti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(findSuggestions)}>
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
                        <FormDescription>
                          Puedes seleccionar múltiples servicios.
                      </FormDescription>
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
                        <PopoverContent
                          className="w-auto p-0"
                          align="start"
                        >
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
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  'Buscar Horarios Disponibles'
                )}
              </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
