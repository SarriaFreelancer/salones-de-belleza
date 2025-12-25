'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Loader2, Calendar, UserCog, MoreHorizontal, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '../ui/skeleton';
import {
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import type { Customer, Appointment, Service, Stylist } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';

// ***** Sub-components for Dialogs *****

const loginSchema = z.object({
  email: z.string().email('El correo no es válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre es requerido.'),
  lastName: z.string().min(2, 'El apellido es requerido.'),
  phone: z.string().min(7, 'El teléfono es requerido.'),
  email: z.string().email('El correo no es válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const profileSchema = z.object({
    firstName: z.string().min(2, 'El nombre es requerido.'),
    lastName: z.string().min(2, 'El apellido es requerido.'),
    phone: z.string().min(7, 'El teléfono es requerido.'),
});


function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { clientLogin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await clientLogin(values.email, values.password);
      onLoginSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Inicio de Sesión',
        description: 'Las credenciales son incorrectas. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tu@correo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Iniciar Sesión
        </Button>
      </form>
    </Form>
  );
}

function SignupForm({ onSignupSuccess }: { onSignupSuccess: () => void }) {
  const { clientSignup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    try {
      await clientSignup(
        values.email,
        values.password,
        values.firstName,
        values.lastName,
        values.phone
      );
      onSignupSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Registro',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'Este correo ya está registrado. Intenta iniciar sesión.'
            : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ana" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellido</FormLabel>
                <FormControl>
                  <Input placeholder="García" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="phone"
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
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tu@correo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrarse
        </Button>
      </form>
    </Form>
  );
}

function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-8 shadow-xl border">
        <Tabs defaultValue="login" className="w-full">
            <DialogHeader className="text-center mb-4">
            <DialogTitle className="text-2xl font-headline">
                <span className="block data-[state=active]:hidden">Bienvenida de Vuelta</span>
                <span className="hidden data-[state=active]:block">Crea tu Cuenta</span>
            </DialogTitle>
            <DialogDescription>
                Accede a tu cuenta para agendar y gestionar tus citas.
            </DialogDescription>
            </DialogHeader>
            <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="pt-4">
            <LoginForm onLoginSuccess={handleSuccess} />
            </TabsContent>
            <TabsContent value="register" className="pt-4">
            <SignupForm onSignupSuccess={handleSuccess} />
            </TabsContent>
        </Tabs>
        </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({ open, onOpenChange, customer }: { open: boolean, onOpenChange: (open: boolean) => void, customer: Customer }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            phone: customer.phone || '',
        },
    });

    useEffect(() => {
        form.reset({
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            phone: customer.phone || '',
        });
    }, [customer, form]);

    const onSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            const customerRef = doc(firestore, 'customers', customer.id);
            await updateDoc(customerRef, values);
            toast({
                title: 'Perfil Actualizado',
                description: 'Tus datos se han guardado correctamente.',
            });
            onOpenChange(false);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo actualizar tu perfil.',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mi Perfil</DialogTitle>
                    <DialogDescription>Actualiza tus datos personales.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Apellido</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Teléfono</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AppointmentsDialog({ open, onOpenChange, userId }: { open: boolean, onOpenChange: (open: boolean) => void, userId: string }) {
    const firestore = useFirestore();
    const { services } = useServices();
    const { stylists } = useStylists();
    const { toast } = useToast();
    const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);

    const appointmentsCollection = useMemoFirebase(() => 
        firestore ? collection(firestore, 'customers', userId, 'appointments') : null, 
    [firestore, userId]);
    
    const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsCollection, true);

    const handleCancelAppointment = async () => {
        if (!appointmentToCancel || !firestore) return;

        const batch = writeBatch(firestore);
        try {
            const { id, customerId, stylistId } = appointmentToCancel;
            
            const adminAppointmentRef = doc(firestore, 'admin_appointments', id);
            batch.update(adminAppointmentRef, { status: 'cancelled' });
            
            const stylistAppointmentRef = doc(firestore, 'stylists', stylistId, 'appointments', id);
            batch.update(stylistAppointmentRef, { status: 'cancelled' });

            const customerAppointmentRef = doc(firestore, 'customers', customerId, 'appointments', id);
            batch.update(customerAppointmentRef, { status: 'cancelled' });

            await batch.commit();

            toast({
                title: 'Cita Cancelada',
                description: 'Tu cita ha sido cancelada con éxito.',
            });
        } catch (error) {
            console.error("Error cancelling appointment:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo cancelar la cita. Inténtalo de nuevo.',
            });
        } finally {
            setAppointmentToCancel(null);
        }
    };


    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Mis Citas</DialogTitle>
                        <DialogDescription>Aquí puedes ver el historial de tus citas.</DialogDescription>
                    </DialogHeader>
                    {isLoading ? (
                        <div className="space-y-4 py-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : appointments && appointments.length > 0 ? (
                        <ul className="space-y-3 max-h-[60vh] overflow-y-auto mt-4 pr-3">
                            {appointments.sort((a, b) => (b.start as any).seconds - (a.start as any).seconds).map(appointment => {
                                const service = services.find(s => s.id === appointment.serviceId);
                                const stylist = stylists.find(s => s.id === appointment.stylistId);
                                const appointmentDate = (appointment.start as any).toDate();
                                const canBeCancelled = ['scheduled', 'confirmed'].includes(appointment.status);
                                
                                return (
                                    <li key={appointment.id} className="flex items-center justify-between rounded-md border bg-background p-3 gap-2">
                                        <div className="flex-1 space-y-1 text-sm">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold">{service?.name || 'Servicio no encontrado'}</span>
                                                 <Badge variant={appointment.status === 'confirmed' ? 'default' : appointment.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">
                                                    {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground">Con: {stylist?.name || 'Estilista no disponible'}</p>
                                            <p className="text-muted-foreground">{format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                                        </div>
                                        {canBeCancelled && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onSelect={() => setAppointmentToCancel(appointment)}
                                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    >
                                                        <XCircle className="mr-2 h-4 w-4" />
                                                        Cancelar Cita
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                            <Calendar className="h-12 w-12" />
                            <p className="mt-4">No tienes ninguna cita registrada.</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!appointmentToCancel} onOpenChange={(isOpen) => !isOpen && setAppointmentToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción cancelará tu cita. Si necesitas reagendar, por favor, ponte en contacto con nosotros.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cerrar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelAppointment} className={buttonVariants({variant: "destructive"})}>
                            Confirmar Cancelación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


function MyAccountDialogs({ customer, userId }: { customer: Customer, userId: string }) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(false);

    return (
        <>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{customer.firstName} {customer.lastName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{customer.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsAppointmentsOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Mis Citas</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsProfileOpen(true)}>
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => useAuth().logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            
            <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} customer={customer} />
            <AppointmentsDialog open={isAppointmentsOpen} onOpenChange={setIsAppointmentsOpen} userId={userId} />
        </>
    );
}

// ***** Main Component *****

export default function UserAuth() {
  const { user, isUserLoading } = useAuth();
  const firestore = useFirestore();
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  const customerDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'customers', user.uid) : null),
    [firestore, user]
  );
  
  const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerDocRef, !!user);

  if (isUserLoading || (user && isCustomerLoading)) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user && customer) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="rounded-full">
                <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt={customer.firstName} data-ai-hint="person face"/>
                    <AvatarFallback>{customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}</AvatarFallback>
                </Avatar>
                Mi Cuenta
            </Button>
            </DropdownMenuTrigger>
            <MyAccountDialogs customer={customer} userId={user.uid} />
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button onClick={() => setIsAuthDialogOpen(true)}>
        <User className="mr-2 h-4 w-4" />
        Iniciar Sesión
      </Button>
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </>
  );
}
