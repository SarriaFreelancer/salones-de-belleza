'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { services, stylists, appointments } from '@/lib/data';
import { suggestAppointment } from '@/ai/flows/appointment-suggestions';
import { Loader2, Sparkles, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
  customerName: z.string().optional(),
});

type Suggestion = {
  stylistId: string;
  startTime: string;
  endTime: string;
};

interface NewAppointmentDialogProps {
  children: React.ReactNode;
  onAppointmentCreated: (appointment: Appointment) => void;
}

export default function NewAppointmentDialog({ children, onAppointmentCreated }: NewAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const resetDialog = () => {
    form.reset();
    setStep(1);
    setIsLoading(false);
    setSuggestions([]);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetDialog();
    }
  };

  const findSuggestions = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setSuggestions([]);
    const selectedService = services.find((s) => s.id === values.serviceId);
    if (!selectedService) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Servicio no encontrado.',
      });
      setIsLoading(false);
      return;
    }

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
        service: selectedService.name,
        duration: selectedService.duration,
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
          description: 'No se encontraron horarios disponibles con los criterios seleccionados. Por favor, intenta con otra fecha o servicio.',
        });
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error del Asistente IA',
        description: 'No se pudieron obtener las sugerencias. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    const customerName = form.getValues('customerName');
    if (!customerName || customerName.trim() === '') {
        form.setError('customerName', { type: 'manual', message: 'El nombre del cliente es requerido.' });
        return;
    }
    form.clearErrors('customerName');

    const selectedService = services.find(s => s.id === form.getValues('serviceId'));
    const preferredDate = form.getValues('preferredDate');

    const [startHours, startMinutes] = suggestion.startTime.split(':').map(Number);
    const startDate = new Date(preferredDate);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const [endHours, endMinutes] = suggestion.endTime.split(':').map(Number);
    const endDate = new Date(preferredDate);
    endDate.setHours(endHours, endMinutes, 0, 0);


    const newAppointment: Appointment = {
        id: String(Date.now()),
        customerName: customerName.trim(),
        serviceId: selectedService!.id,
        stylistId: suggestion.stylistId,
        start: startDate,
        end: endDate,
        status: 'scheduled',
    };
    
    onAppointmentCreated(newAppointment);

    toast({
      title: '¡Cita Agendada!',
      description: `Se ha agendado a ${newAppointment.customerName} el ${format(newAppointment.start, "eeee, d 'de' MMMM 'a las' HH:mm", { locale: es })}.`,
    });

    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Sparkles className="text-primary" /> Asistente de Citas IA
          </DialogTitle>
          <DialogDescription>
            Encuentra el momento perfecto para la próxima cita del cliente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-8">
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Paso 1: Elige el servicio y la fecha</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servicio</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <FormLabel>Fecha Preferida</FormLabel>
                         <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: es })
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
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
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
                 <DialogFooter>
                    <Button type="button" onClick={form.handleSubmit(findSuggestions)} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        'Buscar Horarios Disponibles'
                      )}
                    </Button>
                </DialogFooter>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                 <p className="text-sm font-medium">Paso 2: Confirma los detalles</p>
                 <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Cliente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ana García" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <h3 className="text-md font-medium pt-4">Horarios Sugeridos por la IA</h3>
                <ScrollArea className="h-64 pr-4">
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => {
                      const stylist = stylists.find(s => s.id === suggestion.stylistId);
                      return (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-accent/50">
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-2 font-semibold">
                                  <Clock className="h-4 w-4"/>
                                  <span>{suggestion.startTime} - {suggestion.endTime}</span>
                               </div>
                               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                   <User className="h-4 w-4"/>
                                   <span>con {stylist?.name || 'Estilista desconocido'}</span>
                               </div>
                            </div>
                          <Button size="sm" onClick={() => selectSuggestion(suggestion)}>
                            Agendar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Volver
                  </Button>
                </DialogFooter>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
