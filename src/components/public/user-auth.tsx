'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
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
import { Loader2, LogOut, User, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, Timestamp, writeBatch, collection } from 'firebase/firestore';
import type { Customer, Appointment } from '@/lib/types';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import EditProfileForm from './edit-profile-form';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';

// --- Login/Signup Dialog ---

const loginFormSchema = z.object({
  email: z.string().email('Por favor ingresa un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

const signupFormSchema = z.object({
    firstName: z.string().min(2, 'El nombre es requerido.'),
    lastName: z.string().min(2, 'El apellido es requerido.'),
    phone: z.string().min(7, 'El teléfono es requerido.'),
    email: z.string().email('Por favor ingresa un correo válido.'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});
type SignupFormValues = z.infer<typeof signupFormSchema>;


function LoginDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { clientLogin } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      await clientLogin(values.email, values.password);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: 'Tus credenciales son incorrectas. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar Sesión</DialogTitle>
          <DialogDescription>
            Ingresa a tu cuenta para gestionar tus citas.
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
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingresar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SignupDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { clientSignup } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '' },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
      onOpenChange(false);
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Error al registrarse',
        description: error.code === 'auth/email-already-in-use' 
            ? 'Este correo ya está registrado. Intenta iniciar sesión.'
            : 'No se pudo crear tu cuenta. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Cuenta</DialogTitle>
          <DialogDescription>
            Regístrate para agendar citas y gestionar tu perfil.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ana" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input placeholder="García" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
             <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="3001234567" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Correo</FormLabel><FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" placeholder="********" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
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


// --- Profile Dialog ---

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [isClient, setIsClient] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const customerDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
    [user, firestore]
  );
  const { data: customer, isLoading } = useDoc<Customer>(customerDocRef);

  if (!isClient || !user) {
    return null;
  }

  const handleProfileUpdate = async (values: {
    firstName: string;
    lastName: string;
    phone: string;
  }) => {
    if (!customerDocRef) return;
    
    try {
        await setDoc(customerDocRef, values, { merge: true });
        toast({
            title: '¡Perfil Actualizado!',
            description: 'Tu información ha sido guardada correctamente.',
        });
        onOpenChange(false);
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Error al actualizar',
            description: 'No se pudo guardar tu perfil. Inténtalo de nuevo.',
        });
    }
  };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mi Perfil</DialogTitle>
                    <DialogDescription>
                        Actualiza tu información personal.
                    </DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : customer ? (
                    <EditProfileForm
                        customer={customer}
                        onSaveChanges={handleProfileUpdate}
                    />
                ) : (
                    <p>No se pudo cargar la información del perfil.</p>
                )}
            </DialogContent>
        </Dialog>
    );
}

// --- Appointments Dialog ---

interface MyAppointmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MyAppointmentsDialog({ open, onOpenChange }: MyAppointmentsDialogProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { services } = useServices();
  const { stylists } = useStylists();
  const { toast } = useToast();

  const [appointmentToCancel, setAppointmentToCancel] = React.useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const appointmentsCollection = useMemoFirebase(
    () =>
      user && firestore
        ? collection(firestore, 'customers', user.uid, 'appointments')
        : null,
    [user, firestore]
  );
  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsCollection, true);

  const handleCancel = async () => {
    if (!appointmentToCancel) return;
    setIsCancelling(true);
    try {
      const result = await cancelAppointment({
        appointmentId: appointmentToCancel.id,
        customerId: appointmentToCancel.customerId,
        stylistId: appointmentToCancel.stylistId,
      });

      if (result.success) {
        toast({
          title: 'Cita Cancelada',
          description: 'Tu cita ha sido cancelada exitosamente.',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Cancelar',
        description: 'No se pudo cancelar la cita. Por favor, contacta al salón.',
      });
    } finally {
      setIsCancelling(false);
      setAppointmentToCancel(null);
    }
  };
  
  const sortedAppointments = React.useMemo(() => {
    if (!appointments) return [];
    return [...appointments].sort((a, b) => {
        const dateA = a.start instanceof Timestamp ? a.start.toMillis() : new Date(a.start).getTime();
        const dateB = b.start instanceof Timestamp ? b.start.toMillis() : new Date(b.start).getTime();
        return dateB - dateA;
    });
  }, [appointments]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mis Citas</DialogTitle>
            <DialogDescription>
              Aquí puedes ver el historial y estado de tus citas.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : sortedAppointments && sortedAppointments.length > 0 ? (
              <ul className="space-y-4">
                {sortedAppointments.map((app) => {
                  const service = services.find((s) => s.id === app.serviceId);
                  const stylist = stylists.find((s) => s.id === app.stylistId);
                  const appointmentDate = app.start instanceof Date ? app.start : app.start.toDate();
                  const isPast = appointmentDate < new Date();

                  return (
                    <li key={app.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{service?.name || 'Servicio Desconocido'}</h4>
                          <p className="text-sm text-muted-foreground">con {stylist?.name || 'Estilista Desconocido'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(appointmentDate, "PPP 'a las' p", { locale: es })}
                          </p>
                        </div>
                        <Badge
                          variant={
                            app.status === 'confirmed' ? 'default'
                            : app.status === 'cancelled' ? 'destructive'
                            : 'secondary'
                          }
                          className="capitalize"
                        >
                          {app.status === 'scheduled' ? 'Agendada'
                           : app.status === 'confirmed' ? 'Confirmada'
                           : 'Cancelada'}
                        </Badge>
                      </div>
                      {app.status !== 'cancelled' && !isPast && (
                         <div className="flex justify-end pt-2 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAppointmentToCancel(app)}
                            >
                                Cancelar Cita
                            </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No tienes citas agendadas.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!appointmentToCancel} onOpenChange={(isOpen) => !isOpen && setAppointmentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Confirmas que quieres cancelar esta cita?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isCancelling}>
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


// --- Main Auth Component ---

export default function UserAuth() {
  const { user, isUserLoading, logout } = useAuth();
  const [dialog, setDialog] = React.useState<'login' | 'signup' | 'profile' | 'appointments' | null>(null);

  const { data: customer } = useDoc<Customer>(
    doc(useFirestore(), 'customers', user?.uid || 'null'),
    true
  );
  
  const {logout: handleLogout} = useAuth();


  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  return (
    <>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-auto px-2 space-x-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt={customer?.firstName || user.email || ''} data-ai-hint="person face" />
                    <AvatarFallback>
                      {customer ? `${customer.firstName?.charAt(0)}${customer.lastName?.charAt(0)}` : user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">Mi Cuenta</span>
                </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{customer?.firstName ? `${customer.firstName} ${customer.lastName}`: 'Cliente'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDialog('appointments')}>
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Mis Citas</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialog('profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDialog('login')}>
            Iniciar Sesión
          </Button>
          <Button onClick={() => setDialog('signup')}>Registrarse</Button>
        </div>
      )}

      <LoginDialog open={dialog === 'login'} onOpenChange={() => setDialog(null)} />
      <SignupDialog open={dialog === 'signup'} onOpenChange={() => setDialog(null)} />
      {user && (
        <>
            <ProfileDialog open={dialog === 'profile'} onOpenChange={() => setDialog(null)} />
            <MyAppointmentsDialog open={dialog === 'appointments'} onOpenChange={() => setDialog(null)} />
        </>
      )}
    </>
  );
}
