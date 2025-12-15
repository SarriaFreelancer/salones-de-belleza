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
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
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
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

const formSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un servicio.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
  customerName: z.string().min(2, 'El nombre del cliente es requerido.'),
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
    
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La base de datos no está disponible.',
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
    const appointmentsCollection = collection(firestore, 'admin/appointments/appointments');
    // In a real app you might query instead of fetching all, but this is fine for this use case
    const dayOfWeek = format(values.preferredDate, 'eeee', { locale: es }).toLowerCase() as DayOfWeek;

    try {
      // This is a simplified approach. In a production app, you might want to fetch appointments
      // for the specific date only using a query.
      const allAppointments: Appointment[] = []; // Assuming we get this from a hook or prop
      const existingAppointmentsForDate = allAppointments
        .filter((a) => {
            const appDate = a.start instanceof Timestamp ? a.start.toDate() : new Date(a.start as any);
            return format(appDate, 'yyyy-MM-dd') === formattedDate;
        })
        .map((a) => {
            const startDate = a.start instanceof Timestamp ? a.start.toDate() : new Date(a.start as any);
            const endDate = a.end instanceof Timestamp ? a.end.toDate() : new Date(a.end as any);
            return {
                stylistId: a.stylistId,
                start: format(startDate, 'HH:mm'),
                end: format(endDate, 'HH:mm'),
            };
        });

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

  const selectSuggestion = async (suggestion: Suggestion) => {
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

    const newAppointmentData: Omit<Appointment, 'id'> = {
      customerName: values.customerName.trim(),
      serviceId: serviceId, // Simplified for now
      stylistId: suggestion.stylistId,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      status: 'scheduled',
    };
    
    const appointmentsCollection = collection(firestore, 'admin/appointments/appointments');
    await addDocumentNonBlocking(appointmentsCollection, newAppointmentData);
    
    // In a real app with customer accounts, you would use the actual customer ID.
    // Since this is a public form, we'll skip writing to the customer's sub-collection for now.

    const stylistAppointmentsCollection = collection(firestore, 'stylists', suggestion.stylistId, 'appointments');
    await addDocumentNonBlocking(stylistAppointmentsCollection, newAppointmentData);


    toast({
      title: '¡Cita Agendada!',
      description: `Se ha agendado a ${
        newAppointmentData.customerName
      } el ${format(
        startDate,
        "eeee, d 'de' MMMM 'a las' HH:mm",
        { locale: es }
      )}.`,
    });

    setStep(3); // Go to confirmation step
  };

  const selectedServices = services.filter((s) =>
    form.watch('serviceIds').includes(s.id)
  );

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center gap-2 justify-center">
            <Sparkles className="text-primary" />
            Agenda tu Cita
        </CardTitle>
        <CardDescription className="text-center">
          Usa nuestro asistente de IA para encontrar el momento perfecto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
            <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(findSuggestions)}>
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
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                        size="lg"
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
        )}
        {step === 2 && (
            <div className="space-y-4">
            <h3 className="font-semibold text-center">Paso 2: Elige un horario</h3>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                <h4 className="font-semibold">Resumen de la Cita</h4>
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
            <div className="text-center pt-4">
                <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                >
                Volver
                </Button>
            </div>
            </div>
        )}
        {step === 3 && (
            <div className="text-center space-y-4 py-8">
                <Check className="mx-auto h-16 w-16 text-green-500 bg-green-100 rounded-full p-2" />
                <h2 className="text-2xl font-bold font-headline">¡Cita Agendada!</h2>
                <p className="text-muted-foreground">
                    Hemos recibido tu solicitud de cita. ¡Te esperamos en Divas AyA!
                </p>
                <Button onClick={resetForm}>Agendar otra cita</Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
