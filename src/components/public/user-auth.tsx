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
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import type { Customer, Appointment } from '@/lib/types';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, writeBatch } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { Loader2, CalendarDays, User, LogOut, CheckCircle } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import EditProfileForm from './edit-profile-form';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';
import { useToast } from '@/hooks/use-toast';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';


function ProfileDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}) {
  const firestore = useFirestore();

  const handleProfileUpdate = async (updatedData: Partial<Customer>) => {
    if (!customer || !firestore) return;
    const customerRef = doc(firestore, 'customers', customer.id);
    await writeBatch(firestore).update(customerRef, updatedData).commit();
    onOpenChange(false);
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
        {customer ? (
          <EditProfileForm
            customer={customer}
            onSave={handleProfileUpdate}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MyAppointmentsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = React.useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = React.useState<Appointment | null>(null);

  const appointmentsCollection = useMemoFirebase(
    () =>
      user && firestore
        ? doc(firestore, 'customers', user.uid).collection('appointments')
        : null,
    [user, firestore]
  );
  
  const {
    data: appointments,
    isLoading: isLoadingAppointments,
  } = useCollection<Appointment>(appointmentsCollection, true);

  const handleCancel = async () => {
    if (!appointmentToCancel || !user) return;
    setIsCancelling(appointmentToCancel.id);
    try {
      const result = await cancelAppointment({
        appointmentId: appointmentToCancel.id,
        customerId: user.uid,
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
        title: 'Error al cancelar',
        description: 'No se pudo cancelar la cita. Inténtalo de nuevo.',
      });
    } finally {
      setIsCancelling(null);
      setAppointmentToCancel(null);
    }
  };

  const isAppointmentInPast = (appointment: Appointment) => {
    const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
    return appointmentDate < new Date();
  };


  const sortedAppointments = React.useMemo(() => {
    if (!appointments) return [];
    return [...appointments].sort((a, b) => {
      const dateA = a.start instanceof Date ? a.start : a.start.toDate();
      const dateB = b.start instanceof Date ? b.start : b.start.toDate();
      return dateB.getTime() - dateA.getTime();
    });
  }, [appointments]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mis Citas</DialogTitle>
          <DialogDescription>
            Aquí puedes ver el historial y estado de tus citas.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
          {isLoadingAppointments ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : sortedAppointments && sortedAppointments.length > 0 ? (
            <div className="space-y-4">
              {sortedAppointments.map((app) => {
                 const appointmentDate = app.start instanceof Date ? app.start : app.start.toDate();
                 const canCancel = app.status === 'scheduled' && !isAppointmentInPast(app);
                 return (
                  <div key={app.id} className="rounded-lg border p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{format(appointmentDate, "PPP", { locale: es })}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(appointmentDate, "p", { locale: es })}
                        </p>
                      </div>
                      <Badge
                        variant={
                          app.status === 'confirmed'
                            ? 'default'
                            : app.status === 'cancelled'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="capitalize"
                      >
                        {app.status === 'scheduled' ? 'Agendada' : app.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                      </Badge>
                    </div>
                    {canCancel && (
                       <div className="mt-4 flex justify-end">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setAppointmentToCancel(app)}
                           disabled={isCancelling === app.id}
                         >
                           {isCancelling === app.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           Cancelar Cita
                         </Button>
                       </div>
                    )}
                  </div>
                 )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tienes citas registradas.
            </p>
          )}
        </div>
        <AlertDialog
          open={!!appointmentToCancel}
          onOpenChange={(isOpen) => !isOpen && setAppointmentToCancel(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmas la cancelación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Tu espacio se liberará para
                otros clientes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cerrar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>
                Confirmar Cancelación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}


function MyAccountDialogs({
  customer,
}: {
  customer: Customer | null;
}) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [appointmentsOpen, setAppointmentsOpen] = React.useState(false);
  const { logout } = useAuth();
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 rounded-full pl-2 pr-4 h-10"
          >
             <Avatar className="h-8 w-8">
                <AvatarImage src={`https://picsum.photos/seed/${customer?.id}/100/100`} alt={customer?.firstName} data-ai-hint="person face" />
                <AvatarFallback>
                  {customer ? customer.firstName.charAt(0) : <User />}
                </AvatarFallback>
            </Avatar>
            <span className="font-medium">Mi Cuenta</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
           <DropdownMenuLabel>
             <p>¡Hola!</p>
            <p className="font-normal text-muted-foreground truncate">{customer?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAppointmentsOpen(true)}>
            <CalendarDays className="mr-2" />
            <span>Mis Citas</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <User className="mr-2" />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logout()}>
             <LogOut className="mr-2" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        customer={customer}
      />
      <MyAppointmentsDialog
        open={appointmentsOpen}
        onOpenChange={setAppointmentsOpen}
      />
    </>
  );
}



// Main component
export default function UserAuth() {
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [signupOpen, setSignupOpen] = React.useState(false);

  const { user, isUserLoading, clientLogin, clientSignup, logout } = useAuth();
  const firestore = useFirestore();

  const customerDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
    [user, firestore]
  );
  
  const { data: customer } = useDoc<Customer>(customerDocRef, true);

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user && customer) {
    return <MyAccountDialogs customer={customer} />;
  }

  return (
    <>
       <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setLoginOpen(true)}>
          Iniciar Sesión
        </Button>
        <Button onClick={() => setSignupOpen(true)}>Registrarse</Button>
      </div>
      <AuthDialog
        type="login"
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSubmit={clientLogin}
      />
      <AuthDialog
        type="signup"
        open={signupOpen}
        onOpenChange={setSignupOpen}
        onSubmit={clientSignup}
      />
    </>
  );
}


// Generic Auth Dialog for Login/Signup
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'Nombre muy corto'),
  lastName: z.string().min(2, 'Apellido muy corto'),
  phone: z.string().min(7, 'Número de teléfono inválido'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

function AuthDialog({
  type,
  open,
  onOpenChange,
  onSubmit,
}: {
  type: 'login' | 'signup';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (...args: any[]) => Promise<void>;
}) {
  const isLogin = type === 'login';
  const schema = isLogin ? loginSchema : signupSchema;
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isLogin
      ? { email: '', password: '' }
      : { firstName: '', lastName: '', phone: '', email: '', password: '' },
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setError('');
    }
    onOpenChange(isOpen);
  };

  const handleFormSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setError('');
    try {
      if (isLogin) {
        await onSubmit(values.email, values.password);
      } else {
        const signupValues = values as z.infer<typeof signupSchema>;
        await onSubmit(
          signupValues.email,
          signupValues.password,
          signupValues.firstName,
          signupValues.lastName,
          signupValues.phone
        );
      }
      handleOpenChange(false);
    } catch (err: any) {
      let message = 'Ocurrió un error. Intenta de nuevo.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        message = 'Correo o contraseña incorrectos.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este correo ya está registrado.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
             {!isLogin && (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLogin ? 'Ingresar' : 'Registrarme'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
