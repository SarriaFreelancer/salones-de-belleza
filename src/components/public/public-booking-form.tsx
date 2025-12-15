'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const formSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un servicio.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
  customerName: z.string().min(2, 'El nombre es requerido.'),
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
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceIds: [],
      customerName: '',
      customerEmail: '',
    },
  });

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
        // We pass an empty array because we don't have access to all appointments here.
        // The AI flow is designed to handle this gracefully.
        existingAppointments: [], 
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
      serviceId: serviceId, // Simplified for now
      stylistId: suggestion.stylistId,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      status: 'scheduled',
    };
    
    // Add to main admin collection
    const appointmentsCollection = collection(firestore, 'admin', 'appointments', 'appointments');
    addDocumentNonBlocking(appointmentsCollection, newAppointment);
    
    // In a real app, customerId would come from logged-in user, here we use a placeholder
    const customerAppointmentsCollection = collection(firestore, 'customers', 'public_customer', 'appointments');
    addDocumentNonBlocking(customerAppointmentsCollection, newAppointment);

    // Add to the stylist's subcollection
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
      )}. Recibirás una confirmación pronto.`,
    });

    form.reset();
    setStep(1);
    setSuggestions([]);
  };

  const selectedServices = services.filter((s) =>
    form.watch('serviceIds').includes(s.id)
  );

  if (!isClient) {
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-2xl">
            <CardHeader>
                <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center">
                    Cargando Agendamiento...
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </CardContent>
        </Card>
    );
  }

  if (step === 2) {
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-2xl">
            <DialogHeader className="p-6">
                <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                    <Sparkles className="text-primary" /> Horarios Disponibles
                </DialogTitle>
                <DialogDescription>
                   Estos son los mejores momentos que encontramos para ti.
                </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-4">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                    <h4 className="font-semibold">Resumen de tu Cita</h4>
                    <div className='text-sm'>
                        <p><strong>Cliente:</strong> {form.getValues('customerName')}</p>
                        <p><strong>Fecha:</strong> {format(form.getValues('preferredDate'), 'PPP', { locale: es })}</p>
                        <div><strong>Servicios:</strong>
                            <div className='flex flex-wrap gap-1 mt-1'>
                                {selectedServices.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                            </div>
                        </div>
                    </div>
                </div>

                <h3 className="text-md font-medium pt-4">
                  Elige un horario para confirmar:
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
                          >
                            Agendar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Volver y Editar
                  </Button>
                </DialogFooter>
            </div>
        </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl">
        <CardHeader className="text-center">
            <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Agenda tu Cita
            </CardTitle>
            <p className="text-foreground/80">
                Usa nuestro asistente de IA para encontrar el momento perfecto.
            </p>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form className="space-y-8" onSubmit={form.handleSubmit(findSuggestions)}>
                <div className="space-y-4">
                    <p className="text-sm font-medium">
                    Ingresa tus datos y el servicio que deseas
                    </p>
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
                    <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        size="lg"
                    >
                        {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Buscando...
                        </>
                        ) : (
                           <>
                             <Sparkles className="mr-2 h-4 w-4" />
                             Buscar Horarios con IA
                           </>
                        )}
                    </Button>
                    </div>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
