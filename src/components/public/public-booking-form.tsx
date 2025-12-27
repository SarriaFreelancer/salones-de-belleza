'use client';
import * as React from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { add, format, set } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Service, Stylist, Appointment } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMyAppointmentSuggestions } from '@/hooks/use-my-appointment-suggestions';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar un estilista.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface PublicBookingFormProps {
  services: Service[];
  stylists: Stylist[];
}

export default function PublicBookingForm({
  services,
  stylists,
}: PublicBookingFormProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      preferredDate: new Date(),
    },
  });

  const {
    suggestions,
    isLoading: isLoadingSuggestions,
    refetch,
  } = useMyAppointmentSuggestions({
    serviceId: form.watch('serviceId'),
    stylistId: form.watch('stylistId'),
    preferredDate: format(form.watch('preferredDate'), 'yyyy-MM-dd'),
    enabled: step === 2,
  });

  const onSubmit = () => {
    setStep(2);
    refetch(); // Manually trigger fetching suggestions
  };

  const handleSlotSelection = async (slot: string) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes iniciar sesión para agendar una cita.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const values = form.getValues();
      const service = services.find((s) => s.id === values.serviceId);
      if (!service) throw new Error('Servicio no encontrado');

      const startDate = new Date(slot);
      const endDate = add(startDate, { minutes: service.duration });
      
      const newAppointmentData: Omit<Appointment, 'id' | 'customerName'> = {
        customerId: user.uid,
        serviceId: values.serviceId,
        stylistId: values.stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'scheduled',
      };
      
      const customerName = user.displayName || `${user.email?.split('@')[0]}`;
      const finalAppointmentData = {...newAppointmentData, customerName};


      // Firestore batch write
      const batch = writeBatch(firestore);
      const adminAppointmentRef = doc(collection(firestore, 'admin_appointments'));
      batch.set(adminAppointmentRef, {...finalAppointmentData, id: adminAppointmentRef.id});

      const customerAppointmentRef = doc(firestore, 'customers', user.uid, 'appointments', adminAppointmentRef.id);
      batch.set(customerAppointmentRef, {...finalAppointmentData, id: adminAppointmentRef.id});
      
      const stylistAppointmentRef = doc(firestore, 'stylists', values.stylistId, 'appointments', adminAppointmentRef.id);
      batch.set(stylistAppointmentRef, {...finalAppointmentData, id: stylistAppointmentRef.id});


      await batch.commit();

      toast({
        title: '¡Solicitud Recibida!',
        description: `Tu cita para el ${format(startDate, "eeee, d 'de' MMMM 'a las' HH:mm", { locale: es })} está pendiente de confirmación.`,
      });
      setStep(1);
      form.reset();

    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        variant: 'destructive',
        title: 'Error al Agendar',
        description: 'Hubo un problema al crear tu cita. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const selectedService = services.find(s => s.id === form.watch('serviceId'));
  const selectedStylist = stylists.find(s => s.id === form.watch('stylistId'));


  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Agenda tu Cita
        </CardTitle>
        <CardDescription className="text-foreground/80 md:text-xl/relaxed">
          {step === 1 ? 'Elige tu servicio y encuentra un horario disponible.' : 'Selecciona un horario para tu cita.'}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
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
                  name="stylistId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estilista</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estilista" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stylists.map((stylist) => (
                            <SelectItem key={stylist.id} value={stylist.id}>
                              {stylist.name}
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
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                    <h4 className="font-semibold">Resumen de tu selección</h4>
                    <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      <p><strong>Servicio:</strong> {selectedService?.name}</p>
                      <p><strong>Estilista:</strong> {selectedStylist?.name}</p>
                      <p><strong>Fecha:</strong> {format(form.getValues('preferredDate'), 'PPP', { locale: es })}</p>
                    </div>
                  </div>

                  <h3 className="text-md font-medium pt-4">Horarios Disponibles</h3>
                  {isLoadingSuggestions ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {suggestions.map((slot, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => handleSlotSelection(slot.startTime)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            format(new Date(slot.startTime), 'HH:mm')
                          )}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                      <p className="text-muted-foreground">
                        No hay horarios disponibles para esta selección.
                      </p>
                    </div>
                  )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                Volver
              </Button>
            )}
            {step === 1 && (
              <Button type="submit" disabled={!user}>
                {user ? 'Buscar Horarios' : 'Inicia sesión para buscar'}
              </Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
