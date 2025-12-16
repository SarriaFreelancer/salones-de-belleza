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
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';


const formSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un servicio.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Suggestion = {
  stylistId: string;
  startTime: string;
  endTime: string;
};

interface PublicBookingFormProps {
  appointments: Appointment[];
}

export default function PublicBookingForm({
  appointments,
}: PublicBookingFormProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();
  const { services, isLoading: isLoadingServices } = useServices();
  const { stylists, isLoading: isLoadingStylists } = useStylists();
  const firestore = useFirestore();
  const { user, isUserLoading } = useAuth();
  
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceIds: [],
    },
  });
  
  React.useEffect(() => {
    if (user) {
      form.setValue('customerName', user.displayName || '');
      form.setValue('customerEmail', user.email || '');
    }
  }, [user, form]);


  const resetDialog = () => {
    form.reset();
    setStep(1);
    setIsLoading(false);
    setSuggestions([]);
    setOpen(false);
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
    
    // For simplicity, we'll assign the appointment to the first selected service
    const serviceId = selectedServices.length > 0 ? selectedServices[0].id : '';

    const [startHours, startMinutes] = suggestion.startTime.split(':').map(Number);
    const startDate = new Date(values.preferredDate);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const [endHours, endMinutes] = suggestion.endTime.split(':').map(Number);
    const endDate = new Date(values.preferredDate);
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    const customerName = user?.displayName || values.customerName || 'Cliente Anónimo';
    const customerId = user?.uid || 'anonymous';

    const newAppointment: Omit<Appointment, 'id'> = {
      customerName,
      customerId,
      serviceId: serviceId,
      stylistId: suggestion.stylistId,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      status: 'scheduled',
    };
    
    // Add to admin collection for global view
    const adminAppointmentsCollection = collection(firestore, 'admin_appointments');
    addDocumentNonBlocking(adminAppointmentsCollection, newAppointment);
    
    // Add to stylist's subcollection
    const stylistAppointmentsCollection = collection(firestore, 'stylists', suggestion.stylistId, 'appointments');
    addDocumentNonBlocking(stylistAppointmentsCollection, newAppointment);
    
    // If user is logged in, add to their subcollection
    if (user) {
        const customerAppointmentsCollection = collection(firestore, 'customers', user.uid, 'appointments');
        addDocumentNonBlocking(customerAppointmentsCollection, newAppointment);
    }


    toast({
      title: '¡Cita Agendada!',
      description: `Se ha agendado tu cita el ${format(
        startDate,
        "eeee, d 'de' MMMM 'a las' HH:mm",
        { locale: es }
      )}.`,
    });

    resetDialog();
  };

   const selectedServices = services.filter((s) =>
    form.watch('serviceIds').includes(s.id)
  );
  
  if (!isClient || isLoadingServices || isLoadingStylists || isUserLoading) {
      return (
          <div className="space-y-4 text-center">
                <Skeleton className="h-10 w-3/4 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
      )
  }

  return (
    <>
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center space-y-4 text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Agenda tu Cita
            </h2>
            <p className="text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Usa nuestro asistente de IA para encontrar el momento perfecto.
            </p>
        </div>
        <Card className="mx-auto mt-8 max-w-2xl">
            <CardContent className="pt-6">
                 <Form {...form}>
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setOpen(true); }}>
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
                         {!user && (
                            <div className="text-center text-sm text-muted-foreground">
                                Inicia sesión para agendar más rápido la próxima vez.
                            </div>
                         )}
                        <Button type="submit" className="w-full" size="lg" disabled={!form.formState.isValid}>
                           Buscar Disponibilidad con IA
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

    <Dialog open={open} onOpenChange={resetDialog}>
      <DialogContent className="sm:max-w-md md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Sparkles className="text-primary" /> Asistente de Citas IA
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Confirma los detalles para buscar un horario.' : 'Elige el horario que prefieras.'}
          </DialogDescription>
        </DialogHeader>
        {step === 1 && (
             <Form {...form}>
                <form className="space-y-8" onSubmit={form.handleSubmit(findSuggestions)}>
                    <div className="space-y-4">
                        {!user && (
                            <>
                                <p className="text-sm font-medium">Completa tus datos para continuar</p>
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
                                     <FormDescription>Usaremos esto para enviar la confirmación.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                            </>
                        )}
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                            <h4 className="font-semibold">Resumen de la Cita</h4>
                            <div className='text-sm'>
                            <p><strong>Fecha:</strong> {form.getValues('preferredDate') ? format(form.getValues('preferredDate'), 'PPP', { locale: es }) : 'N/A'}</p>
                            <div><strong>Servicios:</strong>
                                <div className='flex flex-wrap gap-1 mt-1'>
                                    {selectedServices.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                                </div>
                            </div>
                            </div>
                        </div>

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
                        'Confirmar y Buscar Horarios'
                        )}
                    </Button>
                    </DialogFooter>
                </form>
            </Form>
        )}

        {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                    <h4 className="font-semibold">Resumen de la Cita</h4>
                    <div className='text-sm'>
                    <p><strong>Cliente:</strong> {user?.displayName || form.getValues('customerName')}</p>
                    <p><strong>Fecha:</strong> {format(form.getValues('preferredDate'), 'PPP', { locale: es })}</p>
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
    </>
  );
}