
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
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
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ChevronDown, User as UserIcon, CalendarDays, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, Customer } from '@/lib/types';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { EditProfileForm } from './edit-profile-form';

// Schemas for forms
const loginSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});
type LoginValues = z.infer<typeof loginSchema>;

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
    phone: z.string().min(7, 'El teléfono debe tener al menos 7 caracteres.'),
    email: z.string().email('Por favor, introduce un correo electrónico válido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
type SignupValues = z.infer<typeof signupSchema>;


// Login Form Component
function LoginForm({ onSuccessfulLogin }: { onSuccessfulLogin: () => void }) {
  const { clientLogin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit: SubmitHandler<LoginValues> = async (data) => {
    setIsLoading(true);
    try {
      await clientLogin(data.email, data.password);
      onSuccessfulLogin();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description:
          'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input
        {...form.register('email')}
        type="email"
        placeholder="Correo Electrónico"
        autoComplete="email"
        disabled={isLoading}
      />
      {form.formState.errors.email && (
        <p className="text-xs text-destructive">
          {form.formState.errors.email.message}
        </p>
      )}
      <Input
        {...form.register('password')}
        type="password"
        placeholder="Contraseña"
        autoComplete="current-password"
        disabled={isLoading}
      />
      {form.formState.errors.password && (
        <p className="text-xs text-destructive">
          {form.formState.errors.password.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Iniciar Sesión
      </Button>
    </form>
  );
}

// Signup Form Component
function SignupForm({ onSuccessfulSignup }: { onSuccessfulSignup: () => void }) {
  const { clientSignup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<SignupValues>({
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

  const onSubmit: SubmitHandler<SignupValues> = async (data) => {
    setIsLoading(true);
    try {
      await clientSignup(data.email, data.password, data.firstName, data.lastName, data.phone);
      onSuccessfulSignup();
    } catch (error: any) {
      let description = 'No se pudo crear la cuenta. Por favor, inténtalo de nuevo.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este correo electrónico ya está en uso. Por favor, inicia sesión.';
      }
      toast({
        variant: 'destructive',
        title: 'Error en el Registro',
        description,
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input {...form.register('firstName')} placeholder="Nombre" disabled={isLoading} />
        <Input {...form.register('lastName')} placeholder="Apellido" disabled={isLoading} />
      </div>
      {form.formState.errors.firstName && (
        <p className="text-xs text-destructive">
          {form.formState.errors.firstName.message}
        </p>
      )}
      {form.formState.errors.lastName && (
        <p className="text-xs text-destructive">
          {form.formState.errors.lastName.message}
        </p>
      )}
      <Input {...form.register('phone')} placeholder="Teléfono" disabled={isLoading} />
      {form.formState.errors.phone && (
        <p className="text-xs text-destructive">
          {form.formState.errors.phone.message}
        </p>
      )}
      <Input
        {...form.register('email')}
        type="email"
        placeholder="Correo Electrónico"
        autoComplete="email"
        disabled={isLoading}
      />
      {form.formState.errors.email && (
        <p className="text-xs text-destructive">
          {form.formState.errors.email.message}
        </p>
      )}
      <Input
        {...form.register('password')}
        type="password"
        placeholder="Contraseña (mín. 8 caracteres)"
        autoComplete="new-password"
        disabled={isLoading}
      />
      {form.formState.errors.password && (
        <p className="text-xs text-destructive">
          {form.formState.errors.password.message}
        </p>
      )}
      <Input
        {...form.register('confirmPassword')}
        type="password"
        placeholder="Confirmar Contraseña"
        autoComplete="new-password"
        disabled={isLoading}
      />
      {form.formState.errors.confirmPassword && (
        <p className="text-xs text-destructive">
          {form.formState.errors.confirmPassword.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Crear Cuenta
      </Button>
    </form>
  );
}


// Login/Signup Dialog
function LoginDialog() {
  const [open, setOpen] = React.useState(false);
  const [isLoginView, setIsLoginView] = React.useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Acceder</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">
            {isLoginView ? 'Bienvenida de Vuelta' : 'Crea tu Cuenta'}
          </DialogTitle>
          <DialogDescription>
            {isLoginView
              ? 'Inicia sesión para agendar y gestionar tus citas.'
              : 'Regístrate para acceder a nuestros servicios en línea.'}
          </DialogDescription>
        </DialogHeader>
        {isLoginView ? (
          <LoginForm onSuccessfulLogin={() => setOpen(false)} />
        ) : (
          <SignupForm onSuccessfulSignup={() => setOpen(false)} />
        )}
        <DialogFooter className="text-center text-sm">
          <Button
            variant="link"
            className="w-full"
            onClick={() => setIsLoginView(!isLoginView)}
          >
            {isLoginView
              ? '¿No tienes una cuenta? Regístrate'
              : '¿Ya tienes una cuenta? Inicia Sesión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function MyAppointments({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isCancelling, setIsCancelling] = React.useState<string | null>(null);
    const [dialogState, setDialogState] = React.useState<{ open: boolean, appointment: Appointment | null }>({ open: false, appointment: null });

    const appointmentsCollection = useMemoFirebase(() => 
        firestore ? collection(firestore, `customers/${userId}/appointments`) : null
    , [firestore, userId]);
    
    const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollection, true);

    const handleCancelClick = (appointment: Appointment) => {
        setDialogState({ open: true, appointment });
    };
    
    const handleConfirmCancel = async () => {
        const appointmentToCancel = dialogState.appointment;
        if (!appointmentToCancel || !firestore) return;

        setIsCancelling(appointmentToCancel.id);
        
        try {
            const batch = writeBatch(firestore);

            const adminAppointmentRef = doc(firestore, 'admin_appointments', appointmentToCancel.id);
            batch.update(adminAppointmentRef, { status: 'cancelled' });

            const stylistAppointmentRef = doc(firestore, 'stylists', appointmentToCancel.stylistId, 'appointments', appointmentToCancel.id);
            batch.update(stylistAppointmentRef, { status: 'cancelled' });
            
            const customerAppointmentRef = doc(firestore, 'customers', userId, 'appointments', appointmentToCancel.id);
            batch.update(customerAppointmentRef, { status: 'cancelled' });

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
                description: 'No se pudo cancelar la cita. Por favor, contacta con el salón.',
            });
        } finally {
            setIsCancelling(null);
            setDialogState({ open: false, appointment: null });
        }
    };
    
    if (isLoadingAppointments) {
        return <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
    }

    if (!appointments || appointments.length === 0) {
        return <div className="text-center text-muted-foreground p-8">No tienes citas programadas.</div>
    }

    return (
        <>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto p-1">
                {appointments
                    .sort((a,b) => (b.start as any).toMillis() - (a.start as any).toMillis())
                    .map((app) => {
                        const appDate = (app.start as any).toDate();
                        const isPast = appDate < new Date();
                        const isCancellable = app.status === 'scheduled' || app.status === 'confirmed';
                    return (
                        <div key={app.id} className="border p-4 rounded-lg flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="font-semibold">{format(appDate, "eeee, dd 'de' MMMM", { locale: es })}</p>
                                <p className="text-sm text-muted-foreground">{format(appDate, "p", { locale: es })}</p>
                            </div>
                            <Badge variant={app.status === 'confirmed' ? 'default' : app.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">
                                {app.status === 'scheduled' ? 'Agendada' : app.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                           </Badge>
                            {!isPast && isCancellable && (
                                <Button size="sm" variant="outline" onClick={() => handleCancelClick(app)} disabled={isCancelling === app.id}>
                                    {isCancelling === app.id ? <Loader2 className="h-4 w-4 animate-spin"/> : "Cancelar"}
                                </Button>
                            )}
                        </div>
                    )
                })}
            </div>
             <AlertDialog open={dialogState.open} onOpenChange={(isOpen) => setDialogState({ ...dialogState, open: isOpen })}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmas la cancelación?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta acción no se puede deshacer. Para volver a agendar, deberás crear una nueva cita.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                    <AlertDialogAction 
                    onClick={handleConfirmCancel} 
                    className={buttonVariants({ variant: "destructive" })}
                    >
                    Confirmar Cancelación
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

function AppointmentsDialog({ userId, open, onOpenChange }: { userId: string, open: boolean, onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mis Citas</DialogTitle>
          <DialogDescription>Aquí puedes ver el historial y el estado de tus citas.</DialogDescription>
        </DialogHeader>
        <MyAppointments userId={userId} />
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({ user, open, onOpenChange }: { user: Customer, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Mi Perfil</DialogTitle>
            <DialogDescription>Actualiza tu información de contacto.</DialogDescription>
            </DialogHeader>
            <EditProfileForm 
                customer={user} 
                onProfileUpdated={() => {
                    onOpenChange(false);
                     toast({ title: "¡Perfil Actualizado!", description: "Tu información ha sido guardada." });
                }} 
            />
        </DialogContent>
        </Dialog>
    );
}


// Component that shows when the user IS logged in
function MyAccountDialogs() {
    const { user, logout } = useAuth();
    const firestore = useFirestore();
    const [isAppointmentsOpen, setIsAppointmentsOpen] = React.useState(false);
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);

    const customerDocRef = useMemoFirebase(() =>
        firestore && user ? doc(firestore, 'customers', user.uid) : null
    , [firestore, user]);

    const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerDocRef, true);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error(error);
        }
    };
    
    if (isLoadingCustomer || !customer) {
        return <Skeleton className="h-10 w-28" />
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost">
                        <Avatar className="h-8 w-8 mr-2">
                             <AvatarImage src={`https://picsum.photos/seed/${user!.uid}/100/100`} alt={customer.firstName} data-ai-hint="person face" />
                            <AvatarFallback>{customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="hidden md:inline">{customer.firstName}</span>
                        <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onSelect={() => setIsAppointmentsOpen(true)}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        <span>Mis Citas</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsProfileOpen(true)}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Mi Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                         <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AppointmentsDialog 
                userId={user!.uid}
                open={isAppointmentsOpen}
                onOpenChange={setIsAppointmentsOpen}
            />

            <ProfileDialog 
                user={customer}
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
            />
        </>
    );
}

// Main export, switches between Login and MyAccount dialogs
export default function UserAuth() {
  const { user, isUserLoading } = useAuth();

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  return user ? <MyAccountDialogs /> : <LoginDialog />;
}
