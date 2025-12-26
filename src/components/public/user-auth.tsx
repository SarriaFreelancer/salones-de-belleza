'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { LogIn, UserCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { Customer, Appointment } from '@/lib/types';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';

// --- Login/Signup Dialog ---

const LoginSignupForm = ({
  isLogin,
  onSuccess,
}: {
  isLogin: boolean;
  onSuccess: () => void;
}) => {
  const { clientLogin, clientSignup } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loginSchema = z.object({
    email: z.string().email('Correo no válido.'),
    password: z.string().min(1, 'La contraseña es requerida.'),
  });

  const signupSchema = z.object({
    firstName: z.string().min(2, 'El nombre es muy corto.'),
    lastName: z.string().min(2, 'El apellido es muy corto.'),
    phone: z.string().min(7, 'El teléfono no es válido.'),
    email: z.string().email('Correo no válido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  });

  const form = useForm({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await clientLogin(values.email, values.password);
      } else {
        await clientSignup(
          values.email,
          values.password,
          values.firstName,
          values.lastName,
          values.phone
        );
      }
      onSuccess();
    } catch (err: any) {
      const defaultMessage = 'Ocurrió un error. Por favor, inténtalo de nuevo.';
      let errorMessage = defaultMessage;
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'El correo o la contraseña son incorrectos.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'Este correo electrónico ya está registrado.';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es demasiado débil.';
          break;
      }
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!isLogin && (
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
        )}
        {!isLogin && (
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
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ana@ejemplo.com" {...field} />
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </Button>
      </form>
    </Form>
  );
};

function AuthDialog() {
  const [isLogin, setIsLogin] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LogIn className="mr-2" />
          Iniciar Sesión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">
            {isLogin ? 'Bienvenida de Vuelta' : 'Crea tu Cuenta'}
          </DialogTitle>
          <DialogDescription>
            {isLogin
              ? 'Ingresa para gestionar tus citas.'
              : 'Regístrate para agendar citas fácilmente.'}
          </DialogDescription>
        </DialogHeader>
        <LoginSignupForm isLogin={isLogin} onSuccess={() => setOpen(false)} />
        <DialogFooter className="text-sm text-center">
          <Button
            variant="link"
            className="w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin
              ? '¿No tienes cuenta? Regístrate aquí.'
              : '¿Ya tienes una cuenta? Inicia sesión.'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Profile Edit Form ---
const profileFormSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 caracteres.'),
});

function EditProfileForm({
  customer,
  onSuccess,
}: {
  customer: Customer;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone: customer.phone || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!firestore) return;
    setLoading(true);
    try {
      const customerDocRef = doc(firestore, 'customers', customer.id);
      await updateDoc(customerDocRef, values);
      toast({
        title: '¡Perfil Actualizado!',
        description: 'Tu información ha sido guardada correctamente.',
      });
      onSuccess();
    } catch (error) {
      console.error('Error updating profile: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar tu perfil.',
      });
    } finally {
      setLoading(false);
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
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// --- My Appointments / My Profile Dialogs ---

function MyAppointmentsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void;}) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { services } = useServices();
  const { stylists } = useStylists();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);

  const appointmentsCollection = useMemoFirebase(
    () =>
      user && firestore
        ? collection(firestore, 'customers', user.uid, 'appointments')
        : null,
    [user, firestore]
  );

  const {
    data: appointments,
    isLoading,
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
          description: 'Tu cita ha sido cancelada correctamente.',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cancelar la cita. Inténtalo de nuevo.',
      });
    } finally {
      setIsCancelling(null);
      setAppointmentToCancel(null);
    }
  };


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
          {isLoading && <p>Cargando citas...</p>}
          {!isLoading && (!appointments || appointments.length === 0) && (
            <p className="text-muted-foreground text-center py-8">
              No tienes ninguna cita agendada.
            </p>
          )}
          {appointments && appointments.length > 0 && (
            <ul className="space-y-4">
              {appointments
                .sort((a,b) => (b.start as any).toMillis() - (a.start as any).toMillis())
                .map((appointment) => {
                  const service = services.find((s) => s.id === appointment.serviceId);
                  const stylist = stylists.find((s) => s.id === appointment.stylistId);
                  const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
                  const isPast = appointmentDate < new Date();
                  const isCancelled = appointment.status === 'cancelled';
                  
                  return (
                    <li key={appointment.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border bg-background p-3 gap-3">
                      <div className="flex-1 space-y-1">
                        <p><strong>Servicio:</strong> {service?.name || 'N/A'}</p>
                        <p><strong>Estilista:</strong> {stylist?.name || 'N/A'}</p>
                        <p><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                         <Badge variant={
                           isCancelled ? 'destructive' : appointment.status === 'confirmed' ? 'default' : 'secondary'
                         } className="capitalize h-min w-min justify-center">
                           {isCancelled ? 'Cancelada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                         </Badge>
                        
                         {!isPast && !isCancelled && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAppointmentToCancel(appointment)}
                                disabled={!!isCancelling}
                            >
                                {isCancelling === appointment.id ? 'Cancelando...' : 'Cancelar Cita'}
                            </Button>
                        )}
                      </div>
                    </li>
                  );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
       <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro de que quieres cancelar?</AlertDialogTitle>
              <AlertDialogDescription>
                  Esta acción no se puede deshacer. Tu horario quedará libre.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cerrar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>Confirmar Cancelación</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const { user } = useAuth();
  const firestore = useFirestore();

  const customerDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
    [user, firestore]
  );
  const { data: customer, isLoading } = useDoc<Customer>(customerDocRef, true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información personal.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p>Cargando perfil...</p>}
        {customer && (
          <EditProfileForm
            customer={customer}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MyAccountMenu() {
  const { user, logout } = useAuth();
  const [dialog, setDialog] = useState<'appointments' | 'profile' | null>(null);
  
  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-3">
             <Avatar className="h-8 w-8">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="person face" />
              <AvatarFallback>
                <UserCircle />
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline">Mi Cuenta</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog('appointments')}>
            Mis Citas
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('profile')}>
            Mi Perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>Cerrar Sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <MyAppointmentsDialog open={dialog === 'appointments'} onOpenChange={(open) => !open && setDialog(null)} />
      <ProfileDialog open={dialog === 'profile'} onOpenChange={(open) => !open && setDialog(null)} />
    </>
  );
}


// --- Main Exported Component ---

export default function UserAuth() {
  const { user, isUserLoading } = useAuth();

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (!user) {
    return <AuthDialog />;
  }
  
  if (user.email === 'admin@divas.com') {
      return null;
  }

  return <MyAccountMenu />;
}
