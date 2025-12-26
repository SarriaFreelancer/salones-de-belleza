'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
import {
  Loader2,
  Calendar,
  LogOut,
  User as UserIcon,
  Ticket,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import type { Appointment, Customer, Service, Stylist } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
import EditProfileForm from './edit-profile-form';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';
import { collection } from 'firebase/firestore';

const loginSchema = z.object({
  email: z.string().email('Por favor, ingresa un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'El nombre es muy corto.'),
    lastName: z.string().min(2, 'El apellido es muy corto.'),
    phone: z.string().min(7, 'El teléfono no es válido.'),
    email: z.string().email('Por favor, ingresa un correo válido.'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

function LoginTab() {
  const [isLoading, setIsLoading] = React.useState(false);
  const { clientLogin } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await clientLogin(values.email, values.password);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al Iniciar Sesión',
        description:
          'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.',
      });
      console.error(error);
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
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  {...field}
                  disabled={isLoading}
                />
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
                <Input
                  type="password"
                  placeholder="********"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Iniciar Sesión
        </Button>
      </form>
    </Form>
  );
}

function SignupTab() {
  const [isLoading, setIsLoading] = React.useState(false);
  const { clientSignup } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof signupSchema>>({
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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al Registrarse',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'Este correo ya está en uso. Intenta iniciar sesión.'
            : 'Ocurrió un error. Por favor, inténtalo de nuevo.',
      });
      console.error(error);
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
                  <Input placeholder="Ana" {...field} disabled={isLoading} />
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
                  <Input placeholder="García" {...field} disabled={isLoading} />
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
                <Input placeholder="3001234567" {...field} disabled={isLoading} />
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
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  {...field}
                  disabled={isLoading}
                />
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
                <Input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
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
              <FormControl>
                <Input
                  type="password"
                  placeholder="Repite la contraseña"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear Cuenta
        </Button>
      </form>
    </Form>
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
  const { services, isLoading: isLoadingServices } = useServices();
  const { stylists, isLoading: isLoadingStylists } = useStylists();
  const { toast } = useToast();
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const appointmentsCollection = useMemoFirebase(
    () =>
      user && firestore
        ? collection(firestore, 'customers', user.uid, 'appointments')
        : null,
    [user, firestore]
  );

  const { data: appointments, isLoading: isLoadingAppointments } =
    useCollection<Appointment>(appointmentsCollection, true);

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!firestore || !user) return;
    setCancellingId(appointment.id);
    try {
      const result = await cancelAppointment({
        appointmentId: appointment.id,
        customerId: user.uid,
        stylistId: appointment.stylistId,
      });

      if (result.success) {
        toast({
          title: 'Cita Cancelada',
          description: 'Tu cita ha sido cancelada.',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error cancelling appointment: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cancelar la cita. Contacta con el salón.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const isLoading =
    isLoadingAppointments || isLoadingServices || isLoadingStylists;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket /> Mis Citas
          </DialogTitle>
          <DialogDescription>
            Aquí puedes ver el historial y estado de tus citas.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !appointments || appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center h-48">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Aún no tienes citas agendadas.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {appointments
                .sort(
                  (a, b) =>
                    (b.start as any).toDate() - (a.start as any).toDate()
                )
                .map((appointment) => {
                  const service = services.find(
                    (s) => s.id === appointment.serviceId
                  );
                  const stylist = stylists.find(
                    (s) => s.id === appointment.stylistId
                  );
                  const appointmentDate = (
                    appointment.start as any
                  ).toDate();
                  const isCancellable =
                    appointment.status === 'scheduled' &&
                    appointmentDate > new Date();
                  const isCancelling = cancellingId === appointment.id;

                  return (
                    <li
                      key={appointment.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="font-semibold text-foreground">
                            {service?.name || 'Servicio Desconocido'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            con {stylist?.name || 'Estilista Desconocido'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(appointmentDate, "PPP 'a las' p", {
                              locale: es,
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                          <Badge
                            variant={
                              appointment.status === 'confirmed'
                                ? 'default'
                                : appointment.status === 'cancelled'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="capitalize"
                          >
                            {appointment.status === 'scheduled'
                              ? 'Agendada'
                              : appointment.status === 'confirmed'
                              ? 'Confirmada'
                              : 'Cancelada'}
                          </Badge>
                          {isCancellable && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelAppointment(appointment)}
                              disabled={isCancelling}
                            >
                              {isCancelling && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const customerDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
    [user, firestore]
  );

  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error,
  } = useDoc<Customer>(customerDocRef, true);

  const handleProfileUpdate = async (
    values: z.infer<typeof EditProfileForm.schema>
  ) => {
    if (!customerDocRef) return false;
    try {
      await updateDoc(customerDocRef, values);
      toast({
        title: '¡Perfil Actualizado!',
        description: 'Tus datos han sido guardados correctamente.',
      });
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Actualizar',
        description:
          'No se pudo guardar tu perfil. Por favor, inténtalo de nuevo.',
      });
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon /> Mi Perfil
          </DialogTitle>
          <DialogDescription>
            Actualiza tus datos personales aquí.
          </DialogDescription>
        </DialogHeader>
        {isLoadingCustomer ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : customer ? (
          <EditProfileForm
            customer={customer}
            onSave={handleProfileUpdate}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <div className="text-center text-red-500 py-4">
            No se pudo cargar tu perfil. {error?.message}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Mi Cuenta</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <DialogHeader className="mb-4">
              <DialogTitle>¡Bienvenida de Vuelta!</DialogTitle>
              <DialogDescription>
                Ingresa a tu cuenta para agendar y gestionar tus citas.
              </DialogDescription>
            </DialogHeader>
            <LoginTab />
          </TabsContent>
          <TabsContent value="signup">
            <DialogHeader className="mb-4">
              <DialogTitle>Crea tu Cuenta</DialogTitle>
              <DialogDescription>
                Regístrate para agendar citas de forma rápida y sencilla.
              </DialogDescription>
            </DialogHeader>
            <SignupTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function UserAuth() {
  const { user, isUserLoading, logout } = useAuth();
  const [dialog, setDialog] = React.useState<
    'auth' | 'appointments' | 'profile' | null
  >(null);

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  const handleOpenChange = (
    dialogName: 'auth' | 'appointments' | 'profile'
  ) => {
    return (isOpen: boolean) => {
      if (!isOpen) {
        setDialog(null);
      } else {
        setDialog(dialogName);
      }
    };
  };

  return user ? (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-12">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || undefined} data-ai-hint="person face" />
              <AvatarFallback>
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
                <span className="font-semibold">Mi Cuenta</span>
                <span className="text-xs text-muted-foreground -mt-1">{user.displayName || user.email}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Hola, {user.displayName || user.email?.split('@')[0]}!</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setDialog('appointments')}>
              <Ticket className="mr-2 h-4 w-4" />
              <span>Mis Citas</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog('profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <MyAppointmentsDialog
        open={dialog === 'appointments'}
        onOpenChange={handleOpenChange('appointments')}
      />
      <ProfileDialog
        open={dialog === 'profile'}
        onOpenChange={handleOpenChange('profile')}
      />
    </>
  ) : (
    <AuthDialog
      open={dialog === 'auth'}
      onOpenChange={handleOpenChange('auth')}
    />
  );
}
