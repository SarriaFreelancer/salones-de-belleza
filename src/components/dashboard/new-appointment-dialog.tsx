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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { add, format, parse, set } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
import {
  collection,
  Timestamp,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMyAppointmentSuggestions } from '@/hooks/use-my-appointment-suggestions';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Debes seleccionar un servicio.'),
  stylistId: z.string().min(1, 'Debes seleccionar un estilista.'),
  preferredDate: z.date({
    required_error: 'Debes seleccionar una fecha.',
  }),
  customerFirstName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),
  customerLastName: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres.'),
  customerEmail: z
    .string()
    .email('El correo electrónico no es válido.')
    .min(5, 'El correo es requerido.'),
  customerPhone: z
    .string()
    .min(7, 'El teléfono debe tener al menos 7 caracteres.'),
});

type FormValues = z.infer<typeof formSchema>;

interface NewAppointmentDialogProps {
  children: React.ReactNode;
  onAppointmentCreated: (appointment: Appointment) => void;
}

export default function NewAppointmentDialog({
  children,
  onAppointmentCreated,
}: NewAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const { services } = useServices();
  const { stylists } = useStylists();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      stylistId: '',
      customerFirstName: '',
      customerLastName: '',
      customerEmail: '',
      customerPhone: '',
      preferredDate: new Date(),
    },
  });
  
  const {
    suggestions: availableSlots,
    isLoading: isCalculating,
    refetch,
  } = useMyAppointmentSuggestions({
    serviceId: form.watch('serviceId'),
    stylistId: form.watch('stylistId'),
    preferredDate: format(form.watch('preferredDate'), 'yyyy-MM-dd'),
    enabled: step === 2,
  });

  const resetDialog = () => {
    form.reset({
      serviceId: '',
      stylistId: '',
      customerFirstName: '',
      customerLastName: '',
      customerEmail: '',
      customerPhone: '',
      preferredDate: new Date(),
    });
    setStep(1);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetDialog();
    }
  };


  const findAvailableSlots = () => {
    setStep(2);
    refetch();
  };
  
  const getOrCreateCustomer = async (values: FormValues): Promise<string> => {
    if (!firestore) throw new Error('Firestore no está disponible');

    const customersRef = collection(firestore, 'customers');
    const q = query(customersRef, where('email', '==', values.customerEmail.trim().toLowerCase()));
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const customerDoc = querySnapshot.docs[0];
        if (!customerDoc.data().id || customerDoc.data().id !== customerDoc.id) {
            await updateDoc(customerDoc.ref, { id: customerDoc.id });
        }
        return customerDoc.id;
    } else {
      const newCustomerData = {
        firstName: values.customerFirstName,
        lastName: values.customerLastName,
        email: values.customerEmail.trim().toLowerCase(),
        phone: values.customerPhone,
      };
      
      const newCustomerDocRef = await addDoc(customersRef, newCustomerData);
      await updateDoc(newCustomerDocRef, { id: newCustomerDocRef.id });

      toast({
        title: "Nuevo Perfil de Cliente Creado",
        description: `${values.customerFirstName} ha sido registrado en la base de datos.`,
      });
      
      return newCustomerDocRef.id;
    }
  };


  const selectSlot = async (slot: string) => {
    if (!firestore) return;
    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) return;

    setIsSubmitting(true);
    try {
      const customerId = await getOrCreateCustomer(values);
      const startDate = new Date(slot);
      const endDate = add(startDate, { minutes: service.duration });

      const newAppointmentData: Omit<Appointment, 'id'> = {
        customerName: `${values.customerFirstName.trim()} ${values.customerLastName.trim()}`,
        customerId: customerId,
        serviceId: values.serviceId,
        stylistId: values.stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'confirmed', // Admin bookings are auto-confirmed
      };
      
      const batch = writeBatch(firestore);

      const mainAppointmentRef = doc(collection(firestore, 'admin_appointments'));
      batch.set(mainAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });
      
      const stylistAppointmentRef = doc(firestore, 'stylists', values.stylistId, 'appointments', mainAppointmentRef.id);
      batch.set(stylistAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });

      const customerAppointmentRef = doc(firestore, 'customers', customerId, 'appointments', mainAppointmentRef.id);
      batch.set(customerAppointmentRef, { ...newAppointmentData, id: mainAppointmentRef.id });
      
      await batch.commit();

      toast({
        title: '¡Cita Agendada!',
        description: `Se ha agendado a ${newAppointmentData.customerName} el ${format(
          startDate,
          "eeee, d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )}.`,
      });

      onAppointmentCreated({ ...newAppointmentData, id: mainAppointmentRef.id });
      handleOpenChange(false);
    } catch (error) {
      console.error('Error creating appointment or customer: ', error);
      toast({
        title: 'Error al Agendar',
        description:
          'No se pudo crear la cita o el cliente. Revisa la consola para más detalles.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = services.find((s) => form.watch('serviceId') === s.id);
  const selectedStylist = stylists.find((s) => form.watch('stylistId') === s.id);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            Agendar Nueva Cita
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Completa los detalles para encontrar un horario.'
              : 'Elige un horario disponible para confirmar.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
            <Form {...form}>
            <form
                className="space-y-4"
                onSubmit={form.handleSubmit(findAvailableSlots)}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="customerFirstName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre del Cliente</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Ana" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="customerLastName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Apellido del Cliente</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: García" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                            <Input
                            type="email"
                            placeholder="ana@ejemplo.com"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                            <Input placeholder="3001234567" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Servicio</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
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
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estilista" />
                            </Trigger>
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
                </div>
                <FormField
                    control={form.control}
                    name="preferredDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Fecha</FormLabel>
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
                <DialogFooter>
                    <Button type="submit" disabled={isCalculating}>
                    {isCalculating ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculando...
                        </>
                    ) : (
                        'Ver Horarios Disponibles'
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
              <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                <p>
                  <strong>Cliente:</strong> {form.getValues('customerFirstName')}{' '}
                  {form.getValues('customerLastName')}
                </p>
                <p>
                  <strong>Fecha:</strong>{' '}
                  {form.getValues('preferredDate')
                    ? format(form.getValues('preferredDate'), 'PPP', {
                        locale: es,
                      })
                    : ''}
                </p>
                <div>
                  <strong>Servicio:</strong>{' '}
                  <Badge variant="secondary">{selectedService?.name}</Badge>
                </div>
                <div>
                  <strong>Estilista:</strong>{' '}
                  <Badge variant="secondary">{selectedStylist?.name}</Badge>
                </div>
              </div>
            </div>

            <h3 className="text-md font-medium pt-4">Horarios Disponibles</h3>
            {isCalculating ? (
              <div className="flex h-32 items-center justify-center">
                 <Loader2 className="mr-2 h-8 w-8 animate-spin" />
              </div>
            ) : availableSlots.length > 0 ? (
              <ScrollArea className="h-64 pr-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => selectSlot(slot.startTime)}
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
              </ScrollArea>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                <p className="text-muted-foreground">
                  No hay horarios disponibles con los criterios seleccionados.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(1);
                }}
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
