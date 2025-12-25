
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, User, Loader2, Calendar, UserCog, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase';
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

const loginSchema = z.object({
  email: z.string().email('Por favor, introduce un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});
type LoginValues = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre es demasiado corto.'),
  lastName: z.string().min(2, 'El apellido es demasiado corto.'),
  phone: z.string().min(7, 'El número de teléfono no es válido.'),
  email: z.string().email('Por favor, introduce un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});
type SignupValues = z.infer<typeof signupSchema>;

const profileSchema = z.object({
  firstName: z.string().min(2, 'El nombre es demasiado corto.'),
  lastName: z.string().min(2, 'El apellido es demasiado corto.'),
  phone: z.string().min(7, 'El número de teléfono no es válido.'),
});
type ProfileValues = z.infer<typeof profileSchema>;

type DialogState = 'login' | 'signup' | 'my-appointments' | 'edit-profile' | null;
type CancelDialogState = { appointment: Appointment } | null;

function AuthDialog({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = React.useState<'login' | 'signup'>('login');
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { clientLogin, clientSignup } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const handleLogin = async (values: LoginValues) => {
    setLoading(true);
    try {
      await clientLogin(values.email, values.password);
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: 'Credenciales incorrectas. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values: SignupValues) => {
    setLoading(true);
    try {
      await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: error.code === 'auth/email-already-in-use'
          ? 'Este correo electrónico ya está en uso.'
          : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <div className="p-8">
            <DialogHeader className="text-center mb-6">
                <DialogTitle className="text-2xl font-headline">
                    {tab === 'login' ? '¡Bienvenida de vuelta!' : 'Crea tu Cuenta'}
                </DialogTitle>
                <DialogDescription>
                    {tab === 'login' ? 'Inicia sesión para gestionar tus citas.' : 'Regístrate para agendar fácilmente.'}
                </DialogDescription>
            </DialogHeader>

            {tab === 'login' ? (
            <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl><Input placeholder="tu@correo.com" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                    {loading && <Loader2 className="mr-2 animate-spin" />}
                    Iniciar Sesión
                </Button>
                </form>
            </Form>
            ) : (
            <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={signupForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ana" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={signupForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Apellido</FormLabel><FormControl><Input placeholder="García" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={signupForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="3001234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={signupForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo</FormLabel><FormControl><Input placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={signupForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                    {loading && <Loader2 className="mr-2 animate-spin" />}
                    Registrarse
                </Button>
                </form>
            </Form>
            )}
        </div>

        <DialogFooter className="flex-row items-center justify-center p-4 border-t bg-muted/50">
            <p className="text-sm text-muted-foreground">
            {tab === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            </p>
            <Button variant="link" onClick={() => setTab(tab === 'login' ? 'signup' : 'login')} className="p-1">
            {tab === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentsDialog({ open, onOpenChange, user }: { open: boolean, onOpenChange: (open: boolean) => void, user: React.ComponentProps<typeof useAuth>['user'] }) {
  const firestore = useFirestore();
  const { services } = useServices();
  const { stylists } = useStylists();
  const { toast } = useToast();
  const [cancelState, setCancelState] = React.useState<CancelDialogState>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'customers', user.uid, 'appointments');
  }, [firestore, user]);

  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsCollection, !!user);
  
  const handleCancelAppointment = async () => {
    if (!firestore || !cancelState || !user) return;
    setIsCancelling(true);
    const { appointment } = cancelState;

    try {
        const batch = writeBatch(firestore);

        const adminAppointmentRef = doc(firestore, 'admin_appointments', appointment.id);
        batch.update(adminAppointmentRef, { status: 'cancelled' });

        const stylistAppointmentRef = doc(firestore, 'stylists', appointment.stylistId, 'appointments', appointment.id);
        batch.update(stylistAppointmentRef, { status: 'cancelled' });

        const customerAppointmentRef = doc(firestore, 'customers', user.uid, 'appointments', appointment.id);
        batch.update(customerAppointmentRef, { status: 'cancelled' });
        
        await batch.commit();

        toast({
            title: 'Cita Cancelada',
            description: 'Tu cita ha sido cancelada exitosamente.',
        });
    } catch (error) {
        console.error("Error cancelling appointment: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo cancelar la cita. Por favor, intenta de nuevo.",
        });
    } finally {
        setIsCancelling(false);
        setCancelState(null);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mis Citas</DialogTitle>
          <DialogDescription>Aquí puedes ver el historial de tus citas.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
          {isLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
             </div>
          ) : appointments && appointments.length > 0 ? (
            <ul className="space-y-4">
              {appointments
                .sort((a,b) => (b.start as any).toMillis() - (a.start as any).toMillis())
                .map((appointment) => {
                const service = services.find(s => s.id === appointment.serviceId);
                const stylist = stylists.find(s => s.id === appointment.stylistId);
                const appointmentDate = (appointment.start as any).toDate();
                const canCancel = appointment.status === 'scheduled' || appointment.status === 'confirmed';

                return (
                  <li key={appointment.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold">{service?.name || 'Servicio Desconocido'}</p>
                            <p className="text-sm text-muted-foreground">con {stylist?.name || 'Estilista Desconocido'}</p>
                            <p className="text-sm text-muted-foreground">{format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                        </div>
                        <Badge variant={appointment.status === 'cancelled' ? 'destructive' : appointment.status === 'confirmed' ? 'default' : 'secondary'} className="capitalize">
                            {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </Badge>
                    </div>
                     {canCancel && (
                        <div className="flex justify-end pt-2 border-t">
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setCancelState({ appointment })}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar Cita
                            </Button>
                        </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12" />
              <p className="mt-4">Aún no tienes citas agendadas.</p>
            </div>
          )}
        </div>
      </DialogContent>
       <AlertDialog open={!!cancelState} onOpenChange={(isOpen) => !isOpen && setCancelState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cancelación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Tu espacio será liberado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAppointment} disabled={isCancelling} className={buttonVariants({ variant: "destructive" })}>
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function ProfileDialog({ open, onOpenChange, user, customer }: { open: boolean, onOpenChange: (open: boolean) => void, user: React.ComponentProps<typeof useAuth>['user'], customer: Customer | null }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
    }
  });

  React.useEffect(() => {
    if (customer) {
      profileForm.reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      });
    }
  }, [customer, profileForm]);

  const handleProfileUpdate = async (values: ProfileValues) => {
    if (!firestore || !user) return;
    setLoading(true);
    try {
        const customerDocRef = doc(firestore, 'customers', user.uid);
        await updateDoc(customerDocRef, values);
        toast({
            title: '¡Perfil Actualizado!',
            description: 'Tu información ha sido guardada correctamente.',
        });
        onOpenChange(false);
    } catch (error) {
         console.error('Error updating profile: ', error);
         toast({
            variant: 'destructive',
            title: 'Error al actualizar',
            description: 'No se pudo guardar tu información. Inténtalo de nuevo.',
         });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>Actualiza tu información personal.</DialogDescription>
        </DialogHeader>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={profileForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={profileForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function UserAuth() {
  const { user, isUserLoading, logout } = useAuth();
  const firestore = useFirestore();
  const [dialog, setDialog] = React.useState<DialogState>(null);

  const customerDoc = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'customers', user.uid);
  }, [firestore, user?.uid]);

  const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerDoc, !!user);

  const isLoading = isUserLoading || (user && isCustomerLoading);

  if (isLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user && customer) {
    return (
      <>
        <AppointmentsDialog open={dialog === 'my-appointments'} onOpenChange={() => setDialog(null)} user={user} />
        <ProfileDialog open={dialog === 'edit-profile'} onOpenChange={() => setDialog(null)} user={user} customer={customer}/>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <User className="mr-2" />
              {customer.firstName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDialog('my-appointments')}>
              <Calendar className="mr-2" />
              Mis Citas
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog('edit-profile')}>
              <UserCog className="mr-2" />
              Mi Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }

  return (
    <AuthDialog>
      <Button variant="outline">
         <User className="mr-2" />
         Iniciar Sesión
      </Button>
    </AuthDialog>
  );
}

    