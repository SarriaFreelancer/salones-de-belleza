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

const formSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un servicio.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
  customerName: z.string().min(2, 'El nombre del cliente es requerido.'),
  customerEmail: z.string().email('El correo electrónico no es válido.').optional().or(z.literal('')),
});

type Suggestion = {
  stylistId: string;
  startTime: string;
  endTime: string;
};

// Instead of useState for step, we derive it from the state of suggestions
type FormState = {
  step: 'form' | 'suggestions';
  isLoading: boolean;
  suggestions: Suggestion[];
}

export default function PublicBookingForm() {
  const [formState, setFormState] = useState<FormState>({
    step: 'form',
    isLoading: false,
    suggestions: [],
  });
  const { toast } = useToast();
  const { services } = useServices();
  const { stylists } = useStylists();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceIds: [],
      customerName: '',
      customerEmail: '',
    },
  });

  const resetForm = () => {
    form.reset();
    setFormState({
        step: 'form',
        isLoading: false,
        suggestions: [],
    });
  };

  const findSuggestions = async (values: z.infer<typeof formSchema>) => {
    setFormState(prev => ({...prev, isLoading: true, suggestions: []}));
    
    const selectedServices = services.filter((s) => values.serviceIds.includes(s.id));
    if (selectedServices.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Servicio no encontrado.',
      });
      setFormState(prev => ({...prev, isLoading: false}));
      return;
    }

    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
    const serviceNames = selectedServices.map(s => s.name).join(', ');
    const formattedDate = format(values.preferredDate, 'yyyy-MM-dd');
    
    // In a real app, you would fetch this from your database
    const existingAppointmentsForDate: any[] = []; 
    
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
        setFormState({ step: 'suggestions', isLoading: false, suggestions: result.suggestions });
      } else {
        toast({
          title: 'No hay disponibilidad',
          description:
            'No se encontraron horarios disponibles con los criterios seleccionados. Por favor, intenta con otra fecha o servicio.',
        });
        setFormState(prev => ({...prev, isLoading: false}));
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error del Asistente IA',
        description: 'No se pudieron obtener las sugerencias. Inténtalo de nuevo.',
      });
      setFormState(prev => ({...prev, isLoading: false}));
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    const values = form.getValues();
    
    toast({
      title: '¡Cita Agendada (Simulación)!',
      description: `Se ha agendado a ${values.customerName.trim()} el ${format(
        values.preferredDate,
        "eeee, d 'de' MMMM",
        { locale: es }
      )} a las ${suggestion.startTime}.`,
    });
    resetForm();
  };

   const selectedServicesData = services.filter((s) =>
    form.watch('serviceIds').includes(s.id)
  );

  return (
    <Card className="w-full max-w-3xl mx-auto">
        <CardHeader className="text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <CardTitle className="font-headline text-3xl">Agenda tu Cita</CardTitle>
            <CardDescription>
                Usa nuestro asistente de IA para encontrar el momento perfecto.
            </CardDescription>
        </CardHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(findSuggestions)}>
                <CardContent className="space-y-6">
                    {formState.step === 'form' && (
                    <div className="space-y-4 transition-opacity duration-300">
                        <p className="text-sm font-medium text-center text-muted-foreground">
                            Paso 1: Completa tus datos y preferencias
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
                                            {selectedServicesData.length > 0
                                            ? selectedServicesData.map((s) => s.name).join(', ')
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
                    </div>
                    )}
                    
                    {formState.step === 'suggestions' && (
                        <div className="space-y-4 transition-opacity duration-300">
                            <p className="text-sm font-medium text-center text-muted-foreground">
                                Paso 2: Revisa los detalles y elige un horario
                            </p>
                             <div className="rounded-lg border bg-card/50 p-4 space-y-2">
                                <h4 className="font-semibold">Resumen de tu Cita</h4>
                                <div className='text-sm text-muted-foreground'>
                                <p><strong className='text-foreground'>Cliente:</strong> {form.getValues('customerName')}</p>
                                <p><strong className='text-foreground'>Fecha:</strong> {format(form.getValues('preferredDate'), 'PPP', { locale: es })}</p>
                                <div><strong className='text-foreground'>Servicios:</strong>
                                    <div className='flex flex-wrap gap-1 mt-1'>
                                        {selectedServicesData.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                                    </div>
                                </div>
                                </div>
                            </div>

                            <h3 className="text-md font-medium pt-4 text-center">
                            Horarios Sugeridos por la IA
                            </h3>
                            <ScrollArea className="h-64 pr-4">
                            <div className="space-y-3">
                                {formState.suggestions.map((suggestion, index) => {
                                const stylist = stylists.find(
                                    (s) => s.id === suggestion.stylistId
                                );
                                return (
                                    <div
                                    key={index}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-accent/50 hover:bg-accent/80"
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
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    {formState.step === 'form' && (
                        <Button type="submit" disabled={formState.isLoading} size="lg">
                            {formState.isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Buscando...
                            </>
                            ) : (
                            'Buscar Horarios'
                            )}
                        </Button>
                    )}
                    {formState.step === 'suggestions' && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFormState(prev => ({...prev, step: 'form'}))}
                        >
                            Volver
                        </Button>
                    )}
                </CardFooter>
            </form>
        </Form>
    </Card>
  );
}

    