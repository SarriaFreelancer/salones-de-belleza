'use client';

import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '../ui/checkbox';


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

interface NewAppointmentDialogProps {
  children: React.ReactNode;
  onAppointmentCreated: (appointment: Appointment) => void;
  appointments: Appointment[];
}

export default function NewAppointmentDialog({
  children,
  onAppointmentCreated,
  appointments,
}: NewAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (open && form.getValues('preferredDate') === undefined) {
      form.setValue('preferredDate', new Date());
    }
  }, [open, form]);

  const resetDialog = () => {
    form.reset({
        serviceIds: [],
        customerName: '',
        customerEmail: '',
        preferredDate: new Date(),
    });
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
      customerId: 'mock_customer_id', // Placeholder
      serviceId: serviceId, // Simplified for now
      stylistId: suggestion.stylistId,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      status: 'scheduled',
    };
    
    const appointmentsCollection = collection(firestore, 'admin_appointments');
    addDocumentNonBlocking(appointmentsCollection, newAppointment);
    
    // This is a mock customer id, in a real app you would get this from the logged in user
    const customerAppointmentsCollection = collection(firestore, 'customers', newAppointment.customerId, 'appointments');
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

    handleOpenChange(false);
  };

   const selectedServices = services.filter((s) =>
    form.watch('serviceIds').includes(s.id)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Sparkles className="text-primary" /> Asistente de Citas IA
          </DialogTitle>
          <DialogDescription>
            Encuentra el momento perfecto para la próxima cita del cliente.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(findSuggestions)}>
              <p className="text-sm font-medium">
                Paso 1: Ingresa los detalles del cliente, servicio y fecha
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Correo Electrónico (Opcional)</FormLabel>
                      <FormControl>
                          <Input placeholder="cliente@correo.com" {...field} />
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
                            <ScrollArea className="h-48">
                                <div className="p-2 space-y-1">
                                {services.map((service) => (
                                    <div key={service.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
                                        <Checkbox
                                            id={`service-${service.id}`}
                                            checked={field.value.includes(service.id)}
                                            onCheckedChange={(checked) => {
                                                const currentValues = form.getValues('serviceIds');
                                                const newValues = checked
                                                    ? [...currentValues, service.id]
                                                    : currentValues.filter((id) => id !== service.id);
                                                form.setValue('serviceIds', newValues, { shouldValidate: true });
                                            }}
                                        />
                                        <label htmlFor={`service-${service.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 w-full">
                                            {service.name}
                                        </label>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
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
              <DialogFooter>
                <Button
                  type="submit"
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
              </DialogFooter>
            </form>
          </Form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">
              Paso 2: Revisa los detalles y elige un horario
            </p>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                <h4 className="font-semibold">Resumen de la Cita</h4>
                <div className='text-sm'>
                <p><strong>Cliente:</strong> {form.getValues('customerName')}</p>
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
                Volver
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
