'use client';

import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { services, stylists, appointments } from '@/lib/data';
import { suggestAppointment } from '@/ai/flows/appointment-suggestions';
import {
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  User,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

const formSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un servicio.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
  customerName: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  customerEmail: z.string().email({
    message: 'Por favor ingresa un correo electrónico válido.',
  }),
});

type Suggestion = {
  stylistId: string;
  startTime: string;
  endTime: string;
};

export default function BookingForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        serviceIds: [],
        customerName: '',
        customerEmail: ''
    }
  });

  const findSuggestions = async (values: z.infer<typeof formSchema>) => {
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
      .filter((a) => format(a.start, 'yyyy-MM-dd') === formattedDate)
      .map((a) => ({
        stylistId: a.stylistId,
        start: format(a.start, 'HH:mm'),
        end: format(a.end, 'HH:mm'),
      }));

    try {
      const result = await suggestAppointment({
        service: serviceNames,
        duration: totalDuration,
        preferredDate: formattedDate,
        stylistAvailability: stylists.map((s) => ({
          stylistId: s.id,
          availableTimes: s.availability,
        })),
        existingAppointments: existingAppointmentsForDate,
      });
      
      if (result.suggestions && result.suggestions.length > 0) {
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
    const values = form.getValues();
    const selectedServices = services.filter(s => values.serviceIds.includes(s.id));
    const serviceId = selectedServices.length > 0 ? selectedServices[0].id : ''; // For simplicity, we save the first service id.

    const [startHours, startMinutes] = suggestion.startTime.split(':').map(Number);
    const startDate = new Date(values.preferredDate);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const [endHours, endMinutes] = suggestion.endTime.split(':').map(Number);
    const endDate = new Date(values.preferredDate);
    endDate.setHours(endHours, endMinutes, 0, 0);

    const newAppointment: Appointment = {
      id: String(Date.now()),
      customerName: values.customerName.trim(),
      serviceId: serviceId, // Or handle multiple IDs differently
      stylistId: suggestion.stylistId,
      start: startDate,
      end: endDate,
      status: 'scheduled',
    };

    appointments.push(newAppointment);

    toast({
      title: '¡Cita Agendada!',
      description: `Se ha agendado a ${newAppointment.customerName} el ${format(
        newAppointment.start,
        "eeee, d 'de' MMMM 'a las' HH:mm",
        { locale: es }
      )}.`,
    });

    form.reset();
    setStep(1);
    setSuggestions([]);
  };

  const selectedServices = services.filter((s) =>
    form.watch('serviceIds').includes(s.id)
  );

  return (
    <Form {...form}>
      <form className="space-y-8" onSubmit={form.handleSubmit(findSuggestions)}>
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">
              Paso 1: Completa tus datos y elige el servicio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
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
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="tu@correo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando horarios...
                </>
              ) : (
                'Buscar Horarios Disponibles'
              )}
            </Button>
          </div>
        )}
      </form>

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-center">
            Paso 2: Elige tu horario ideal
          </h3>
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
          <h4 className="text-md font-medium pt-2">Horarios Sugeridos por la IA</h4>
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
                    <Button size="sm" onClick={() => selectSuggestion(suggestion)}>
                      Confirmar Cita
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setStep(1)}>
              Modificar Selección
            </Button>
          </div>
        </div>
      )}
    </Form>
  );
}