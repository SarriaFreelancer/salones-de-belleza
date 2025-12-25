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
import type { Appointment, DayOfWeek } from '@/lib/types';
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
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { useFirestore, useFirebaseAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

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
  appointments: Appointment[];
}

export default function NewAppointmentDialog({
  children,
  onAppointmentCreated,
  appointments,
}: NewAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const { toast } = useToast();
  const { services } = useServices();
  const { stylists } = useStylists();
  const firestore = useFirestore();
  const auth = useFirebaseAuth();

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
    setIsCalculating(false);
    setAvailableSlots([]);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetDialog();
    }
  };

  const getDayOfWeek = (date: Date): DayOfWeek => {
    const dayIndex = date.getDay();
    const days: DayOfWeek[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[dayIndex];
  };

  const findAvailableSlots = (values: FormValues) => {
    setIsCalculating(true);
    setAvailableSlots([]);
    const { preferredDate, stylistId, serviceId } = values;

    const stylist = stylists.find((s) => s.id === stylistId);
    const service = services.find((s) => s.id === serviceId);

    if (!stylist || !service) {
      toast({
        title: 'Error',
        description: 'Estilista o servicio no válido.',
        variant: 'destructive',
      });
      setIsCalculating(false);
      return;
    }

    const dayOfWeek = getDayOfWeek(preferredDate);
    const availabilityForDay = stylist.availability[dayOfWeek] || [];

    const existingAppointments = appointments.filter((app) => {
      const appDate = app.start instanceof Date ? app.start : app.start.toDate();
      return (
        app.stylistId === stylistId &&
        format(appDate, 'yyyy-MM-dd') === format(preferredDate, 'yyyy-MM-dd')
      );
    });

    const slots: Date[] = [];
    const serviceDuration = service.duration;

    availabilityForDay.forEach((availSlot) => {
      let baseDate = new Date(preferredDate);
      baseDate = set(baseDate, {
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });

      let currentTime = parse(availSlot.start, 'HH:mm', baseDate);
      const endTime = parse(availSlot.end, 'HH:mm', baseDate);

      while (add(currentTime, { minutes: serviceDuration }) <= endTime) {
        const proposedEndTime = add(currentTime, { minutes: serviceDuration });

        const isOverlapping = existingAppointments.some((existingApp) => {
          const existingStart =
            existingApp.start instanceof Date
              ? existingApp.start
              : existingApp.start.toDate();
          const existingEnd =
            existingApp.end instanceof Date
              ? existingApp.end
              : existingApp.end.toDate();
          return currentTime < existingEnd && proposedEndTime > existingStart;
        });

        if (!isOverlapping) {
          slots.push(new Date(currentTime));
        }

        currentTime = add(currentTime, { minutes: 15 });
      }
    });

    setAvailableSlots(slots);

    if (slots.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay disponibilidad',
        description:
          'No se encontraron horarios disponibles para este estilista en la fecha seleccionada.',
      });
    }

    setIsCalculating(false);
    setStep(2);
  };
  
 const getOrCreateCustomer = async (values: FormValues): Promise<string> => {
    if (!firestore || !auth) throw new Error('Firestore o Auth no están disponibles');
    
    const customersRef = collection(firestore, 'customers');
    const q = query(customersRef, where('email', '==', values.customerEmail.trim().toLowerCase()));
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    } else {
      try {
        const tempPassword = Math.random().toString(36).slice(-8);
        const userCredential = await createUserWithEmailAndPassword(auth, values.customerEmail, tempPassword);
        const newUser = userCredential.user;

        const newCustomerData = {
          firstName: values.customerFirstName,
          lastName: values.customerLastName,
          email: values.customerEmail.trim().toLowerCase(),
          phone: values.customerPhone,
          id: newUser.uid,
        };
        
        await setDoc(doc(customersRef, newUser.uid), newCustomerData);

        toast({
            title: "Nuevo Cliente Creado",
            description: `${values.customerFirstName} ha sido registrado. Deberá restablecer su contraseña al iniciar sesión.`,
        });
        
        return newUser.uid;
      } catch (error: any) {
        console.error("Error creating new user in getOrCreateCustomer:", error);
        if (error.code === 'auth/email-already-in-use') {
            toast({
                variant: 'destructive',
                title: 'Error de Autenticación',
                description: 'Este correo ya está registrado en Firebase Auth, pero no como cliente. Contacte al soporte.',
            });
        }
        throw new Error('No se pudo crear el nuevo usuario en Firebase.');
      }
    }
  };


  const selectSlot = async (slot: Date) => {
    if (!firestore) return;
    const values = form.getValues();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) return;

    setIsCalculating(true); // Reuse loading state for booking
    try {
      const customerId = await getOrCreateCustomer(values);

      const startDate = slot;
      const endDate = add(startDate, { minutes: service.duration });

      const newAppointmentData: Omit<Appointment, 'id'> = {
        customerName: `${values.customerFirstName.trim()} ${values.customerLastName.trim()}`,
        customerId: customerId,
        serviceId: values.serviceId,
        stylistId: values.stylistId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        status: 'scheduled',
      };
      
      const batch = writeBatch(firestore);

      // 1. Create the main appointment document
      const mainAppointmentRef = doc(collection(firestore, 'admin_appointments'));
      batch.set(mainAppointmentRef, newAppointmentData);
      
      // 2. Create the mirrored appointment in the stylist's subcollection
      const stylistAppointmentRef = doc(firestore, 'stylists', values.stylistId, 'appointments', mainAppointmentRef.id);
      batch.set(stylistAppointmentRef, newAppointmentData);
      
      // Commit the batch
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
      setIsCalculating(false);
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
                      onClick={() => selectSlot(slot)}
                      disabled={isCalculating}
                    >
                      {isCalculating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        format(slot, 'HH:mm')
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
                  setAvailableSlots([]);
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
