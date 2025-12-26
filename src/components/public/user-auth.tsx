
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { Loader2, CalendarDays, User, LogOut, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc, writeBatch, collection } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import type { Customer, Appointment } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
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
import EditProfileForm from './edit-profile-form';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';


function MyAppointmentsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const firestore = useFirestore();
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
  
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollection, true);

  const sortedAppointments = React.useMemo(() => {
    if (!appointments) return [];
    return appointments.sort((a, b) => (b.start as any).toDate() - (a.start as any).toDate());
  }, [appointments]);

  const handleCancelAppointment = async () => {
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
            description: error instanceof Error ? error.message : 'No se pudo cancelar la cita. Inténtalo de nuevo.',
        });
    } finally {
        setIsCancelling(false);
        setAppointmentToCancel(null);
    }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mis Citas</DialogTitle>
          <DialogDescription>
            Aquí puedes ver el historial de tus citas y gestionar las próximas.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
          {isLoadingAppointments ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : appointments && appointments.length > 0 ? (
            <ul className="space-y-4">
              {sortedAppointments.map((appointment) => {
                const appointmentDate = (appointment.start as any).toDate();
                const canCancel = appointment.status === 'scheduled' && !isPast(appointmentDate);
                return (
                  <li key={appointment.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold">Servicio Contratado</p>
                            <p className="text-sm text-muted-foreground">{format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                        </div>
                        <Badge variant={
                            appointment.status === 'confirmed' ? 'default'
                            : appointment.status === 'cancelled' ? 'destructive'
                            : 'secondary'
                        } className="capitalize">
                            {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </Badge>
                    </div>
                     {canCancel && (
                        <div className="flex justify-end pt-2">
                            <Button variant="outline" size="sm" onClick={() => setAppointmentToCancel(appointment)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Cancelar Cita
                            </Button>
                        </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No tienes citas registradas.
            </div>
          )}
        </div>
      </DialogContent>
       <AlertDialog open={!!appointmentToCancel} onOpenChange={(isOpen) => !isOpen && setAppointmentToCancel(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmas la cancelación?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Tu espacio se liberará para otros clientes.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleCancelAppointment} 
                        disabled={isCancelling}
                        className={buttonVariants({ variant: 'destructive' })}
                    >
                         {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Cancelación
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Dialog>
  );
}


function ProfileDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { user } = useAuth();
    const firestore = useFirestore();

    const customerDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
        [user, firestore]
    );

    const { data: customerData, isLoading: isLoadingCustomer } = useDoc<Customer>(customerDocRef, true);

    return (
        <Dialog open={open} onOpenChange={on.bind(this, onOpenChange)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mi Perfil</DialogTitle>
                    <DialogDescription>
                        Actualiza tu información personal aquí.
                    </DialogDescription>
                </DialogHeader>
                {isLoadingCustomer ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : customerData ? (
                    <EditProfileForm customer={customerData} onSave={() => onOpenChange(false)} />
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        No se pudo cargar tu perfil.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

const loginFormSchema = z.object({
  email: z.string().email('Por favor, introduce un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

const signupFormSchema = z
  .object({
    firstName: z.string().min(2, 'El nombre es demasiado corto.'),
    lastName: z.string().min(2, 'El apellido es demasiado corto.'),
    phone: z.string().min(7, 'El número de teléfono no es válido.'),
    email: z.string().email('Por favor, introduce un correo válido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
type SignupFormValues = z.infer<typeof signupFormSchema>;

function LoginDialog({ open, onOpenChange, onSwitchToSignup }: { open: boolean, onOpenChange: (open: boolean) => void, onSwitchToSignup: () => void }) {
  const { clientLogin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await clientLogin(data.email, data.password);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión',
        description: error.message || 'Las credenciales son incorrectas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Sesión</DialogTitle>
          <DialogDescription>
            Accede a tu cuenta para gestionar tus citas.
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
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="!flex-col !space-y-2 sm:!flex-col sm:!space-y-2">
               <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingresar
              </Button>
               <Button type="button" variant="link" size="sm" onClick={onSwitchToSignup}>
                ¿No tienes una cuenta? Regístrate aquí.
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SignupDialog({ open, onOpenChange, onSwitchToLogin }: { open: boolean, onOpenChange: (open: boolean) => void, onSwitchToLogin: () => void }) {
  const { clientSignup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      await clientSignup(data.email, data.password, data.firstName, data.lastName, data.phone);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        variant: 'destructive',
        title: 'Error de registro',
        description: error.message || 'No se pudo crear la cuenta.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Cuenta</DialogTitle>
          <DialogDescription>
            Regístrate para agendar citas de forma rápida y sencilla.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
             <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Correo</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>Confirmar Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
            
            <DialogFooter className="!flex-col !space-y-2 sm:!flex-col sm:!space-y-2">
               <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cuenta
              </Button>
              <Button type="button" variant="link" size="sm" onClick={onSwitchToLogin}>
                ¿Ya tienes una cuenta? Inicia sesión.
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MyAccountDialogs() {
    const [dialogState, setDialogState] = React.useState<'appointments' | 'profile' | null>(null);
    const { logout } = useAuth();
    const handleLogout = () => {
        logout();
    };

    return (
        <>
            <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            <UserAuth.DisplayName />
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            <UserAuth.Email />
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setDialogState('appointments')}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <span>Mis Citas</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialogState('profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            
            <MyAppointmentsDialog 
                open={dialogState === 'appointments'} 
                onOpenChange={(isOpen) => !isOpen && setDialogState(null)} 
            />
            <ProfileDialog 
                open={dialogState === 'profile'} 
                onOpenChange={(isOpen) => !isOpen && setDialogState(null)} 
            />
        </>
    );
}


function UserAuth() {
    const { user, isUserLoading, logout } = useAuth();
    const [dialogState, setDialogState] = React.useState<'login' | 'signup' | 'appointments' | 'profile' | null>(null);
    
    const handleOpenLogin = () => setDialogState('login');
    const handleOpenSignup = () => setDialogState('signup');

    if (isUserLoading) {
        return <Skeleton className="h-10 w-28" />;
    }

    if (user) {
        return (
            <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2 rounded-full px-2 py-1 h-auto">
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="person face" />
                                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span>Mi Cuenta</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <MyAccountDialogs />
                </DropdownMenu>
            </>
        );
    }
    

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleOpenLogin}>
                Iniciar Sesión
            </Button>
            <Button onClick={handleOpenSignup}>Registrarse</Button>

            <LoginDialog
                open={dialogState === 'login'}
                onOpenChange={(isOpen) => !isOpen && setDialogState(null)}
                onSwitchToSignup={() => setDialogState('signup')}
            />
            <SignupDialog
                open={dialogState === 'signup'}
                onOpenChange={(isOpen) => !isOpen && setDialogState(null)}
                onSwitchToLogin={() => setDialogState('login')}
            />
        </div>
    );
}

UserAuth.DisplayName = function UserAuthDisplayName() {
    const { user } = useAuth();
    if (!user) return null;

    const firestore = useFirestore();
    const customerDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
        [user, firestore]
    );
    const { data: customerData } = useDoc<Customer>(customerDocRef, true);
    
    return <>{customerData ? `${customerData.firstName} ${customerData.lastName}` : (user.displayName || 'Cliente')}</>
};

UserAuth.Email = function UserAuthEmail() {
    const { user } = useAuth();
    return <>{user?.email}</>;
}


export default UserAuth;

    