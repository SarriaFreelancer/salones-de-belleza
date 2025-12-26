'use client';

import * as React from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, LogOut, UserCircle, Settings, CalendarDays, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import type { Customer, Appointment, Service } from '@/lib/types';
import EditProfileForm from './edit-profile-form';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useServices } from '@/hooks/use-services';
import { buttonVariants } from '../ui/button';

// Schemas for Login and Signup Forms
const loginSchema = z.object({
  email: z.string().email('Correo electrónico no válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
    phone: z.string().min(7, 'El teléfono debe tener al menos 7 dígitos.'),
    email: z.string().email('Correo electrónico no válido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
type SignupFormValues = z.infer<typeof signupSchema>;


// #region Login Dialog
function LoginDialog() {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { clientLogin } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      await clientLogin(values.email, values.password);
      setOpen(false);
    } catch (error: any) {
      let description = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = 'El correo o la contraseña son incorrectos.';
      }
      toast({
        variant: 'destructive',
        title: 'Error al Iniciar Sesión',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">Iniciar Sesión</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">¡Bienvenida de vuelta!</DialogTitle>
          <DialogDescription>
            Inicia sesión para ver tu perfil y citas.
          </DialogDescription>
        </DialogHeader>
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
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Sesión
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
// #endregion

// #region Signup Dialog
function SignupDialog() {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { clientSignup } = useAuth();
  const { toast } = useToast();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
      setOpen(false);
    } catch (error: any) {
       let description = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
      }
      toast({
        variant: 'destructive',
        title: 'Error en el Registro',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Crear Cuenta</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Crea tu Cuenta</DialogTitle>
          <DialogDescription>
            Regístrate para agendar citas de forma rápida y sencilla.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl><Input placeholder="Ana" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="García" {...field} /></FormControl>
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
                  <FormControl><Input type="tel" placeholder="3001234567" {...field} /></FormControl>
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
                  <FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl><Input type="password" placeholder="Mínimo 8 caracteres" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cuenta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
// #endregion

// #region My Account Dialog
function MyAccountAppointments({ customerId }: { customerId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [appointmentToCancel, setAppointmentToCancel] = React.useState<Appointment | null>(null);
  
  const { services, isLoading: isLoadingServices } = useServices();

  const appointmentsRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'customers', customerId, 'appointments');
  }, [firestore, customerId]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsRef, true);

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel || !firestore) return;

    try {
      const batch = writeBatch(firestore);
      const appointmentId = appointmentToCancel.id;
      const stylistId = appointmentToCancel.stylistId;

      // Update the status in all three locations
      const customerAppointmentRef = doc(firestore, 'customers', customerId, 'appointments', appointmentId);
      batch.update(customerAppointmentRef, { status: 'cancelled' });

      const adminAppointmentRef = doc(firestore, 'admin_appointments', appointmentId);
      batch.update(adminAppointmentRef, { status: 'cancelled' });

      const stylistAppointmentRef = doc(firestore, 'stylists', stylistId, 'appointments', appointmentId);
      batch.update(stylistAppointmentRef, { status: 'cancelled' });

      await batch.commit();

      toast({
        title: 'Cita Cancelada',
        description: 'Tu cita ha sido cancelada exitosamente.',
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cancelar la cita. Por favor, contacta al salón.',
      });
    } finally {
      setAppointmentToCancel(null);
    }
  };


  const isLoading = isLoadingAppointments || isLoadingServices;
  
  if (isLoading) {
      return <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
      </div>
  }
  
  if (!appointments || appointments.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-48 text-center bg-muted/50 rounded-lg">
              <CalendarDays className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No tienes citas agendadas.</p>
          </div>
      )
  }

  const sortedAppointments = [...appointments].sort((a,b) => {
    const dateA = a.start instanceof Date ? a.start.getTime() : a.start.toDate().getTime();
    const dateB = b.start instanceof Date ? b.start.getTime() : b.start.toDate().getTime();
    return dateB - dateA; // Sort descending
  })

  return (
    <>
      <ScrollArea className="h-96 pr-4">
        <div className="space-y-4">
            {sortedAppointments.map((app) => {
              const service = services.find(s => s.id === app.serviceId);
              const appointmentDate = app.start instanceof Date ? app.start : app.start.toDate();
              const isPast = appointmentDate < new Date() && app.status !== 'cancelled';
              const isCancellable = app.status === 'scheduled' || app.status === 'confirmed';

              return (
                <div key={app.id} className={`p-4 rounded-lg border ${isPast ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{service?.name || 'Servicio Desconocido'}</h4>
                        <p className="text-sm text-muted-foreground">{format(appointmentDate, "eeee, dd 'de' MMMM, yyyy", { locale: es })}</p>
                        <p className="text-sm text-muted-foreground">a las {format(appointmentDate, "HH:mm", { locale: es })}</p>
                      </div>
                      <Badge variant={app.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">{app.status}</Badge>
                    </div>
                    {isCancellable && !isPast && (
                      <div className="mt-4 flex justify-end">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setAppointmentToCancel(app)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar Cita
                        </Button>
                      </div>
                    )}
                </div>
              );
            })}
        </div>
      </ScrollArea>
      <AlertDialog open={!!appointmentToCancel} onOpenChange={(isOpen) => !isOpen && setAppointmentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cancelación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará tu cita. Para volver a agendar, deberás crear una nueva cita. ¿Estás segura?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAppointment} className={buttonVariants({variant: 'destructive'})}>Sí, Cancelar Cita</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


function MyAccountDialogs() {
    const [open, setOpen] = React.useState(false);
    const [profileUpdated, setProfileUpdated] = React.useState(0); // State to trigger re-fetch
    const { user, logout } = useAuth();
    const firestore = useFirestore();

    const customerDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'customers', user.uid);
    }, [firestore, user, profileUpdated]); // Add profileUpdated to dependencies

    const { data: customer, isLoading: isLoadingCustomer, error } = useDoc<Customer>(customerDocRef, true);

    const handleProfileUpdate = () => {
      setProfileUpdated(count => count + 1);
    };

    if (isLoadingCustomer) {
        return <Skeleton className="h-10 w-28" />;
    }

    if (!customer) {
        return (
            <div className="flex items-center gap-2">
                <p className="text-sm text-destructive">Error de perfil</p>
                <Button variant="ghost" size="sm" onClick={() => logout()}>Salir</Button>
            </div>
        )
    }
  
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/100/100`} data-ai-hint="person face" />
                            <AvatarFallback>
                                {customer?.firstName?.charAt(0) || user?.email?.charAt(0) || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <span>Mi Cuenta</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{customer?.firstName || 'Mi Cuenta'}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpen(true)}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Ver Perfil y Citas</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Mi Cuenta</DialogTitle>
                    <DialogDescription>
                        Aquí puedes ver tus citas y actualizar tu información personal.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="appointments" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="appointments"><CalendarDays className="mr-2 h-4 w-4"/>Mis Citas</TabsTrigger>
                        <TabsTrigger value="profile"><Settings className="mr-2 h-4 w-4"/>Mi Perfil</TabsTrigger>
                    </TabsList>
                    <TabsContent value="appointments" className="pt-4">
                        {user && <MyAccountAppointments customerId={user.uid} />}
                    </TabsContent>
                    <TabsContent value="profile" className="pt-4">
                        {customer && <EditProfileForm customer={customer} onUpdate={handleProfileUpdate} />}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// Main exported component
export default function UserAuth() {
  const { user, isUserLoading } = useAuth();

  if (isUserLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  return user ? (
    <MyAccountDialogs />
  ) : (
    <div className="flex items-center gap-2">
      <LoginDialog />
      <SignupDialog />
    </div>
  );
}
