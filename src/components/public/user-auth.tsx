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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  LogOut,
  ChevronDown,
  Calendar,
  Settings,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import {
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  doc,
  collection,
  writeBatch,
  updateDoc,
  where,
  query,
} from 'firebase/firestore';
import type {
  Customer,
  Appointment,
  Service,
  Stylist,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

// Schemas for forms
const loginSchema = z.object({
  email: z.string().email('El correo no es válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre es muy corto.'),
  lastName: z.string().min(2, 'El apellido es muy corto.'),
  phone: z.string().min(7, 'El teléfono no es válido.'),
  email: z.string().email('El correo no es válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const profileSchema = z.object({
  firstName: z.string().min(2, 'El nombre es muy corto.'),
  lastName: z.string().min(2, 'El apellido es muy corto.'),
  phone: z.string().min(7, 'El teléfono no es válido.'),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;
type ProfileValues = z.infer<typeof profileSchema>;

// Auth Dialog Component
function AuthDialog() {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('login');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const { clientLogin, clientSignup } = useAuth();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  const handleLogin = async (values: LoginValues) => {
    setLoading(true);
    setError('');
    try {
      await clientLogin(values.email, values.password);
      setOpen(false);
    } catch (err: any) {
      setError('Credenciales incorrectas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values: SignupValues) => {
    setLoading(true);
    setError('');
    try {
      await clientSignup(
        values.email,
        values.password,
        values.firstName,
        values.lastName,
        values.phone
      );
      setOpen(false);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado.');
      } else {
        setError('No se pudo crear la cuenta. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!open) {
      loginForm.reset();
      signupForm.reset();
      setError('');
    }
  }, [open, loginForm, signupForm]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <User className="mr-2 h-4 w-4" />
          Iniciar Sesión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <DialogHeader className="items-center">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            {activeTab === 'login' && (
              <>
                <DialogTitle className="text-2xl font-headline pt-4">
                  ¡Bienvenida de Vuelta!
                </DialogTitle>
                <DialogDescription>
                  Ingresa para agendar y gestionar tus citas.
                </DialogDescription>
              </>
            )}
            {activeTab === 'signup' && (
              <>
                <DialogTitle className="text-2xl font-headline pt-4">
                  Crea tu Cuenta
                </DialogTitle>
                <DialogDescription>
                  Únete a Divas A&A para una experiencia única.
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          <TabsContent value="login" className="space-y-4">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                <div className="space-y-4 py-4">
                  <FormField
                    control={loginForm.control}
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
                    control={loginForm.control}
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
                </div>
                {error && activeTab === 'login' && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={loading} className="w-full mt-6">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleSignup)}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
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
                      control={signupForm.control}
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
                    control={signupForm.control}
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
                  <FormField
                    control={signupForm.control}
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
                    control={signupForm.control}
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
                </div>
                {error && activeTab === 'signup' && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={loading} className="w-full mt-6">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrarse
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for "My Profile"
function ProfileDialog({
  customer,
  onOpenChange,
}: {
  customer: Customer;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
  });

  const handleProfileUpdate = async (values: ProfileValues) => {
    if (!firestore) return;
    setLoading(true);
    try {
      const customerDocRef = doc(firestore, 'customers', customer.id);
      await updateDoc(customerDocRef, values);
      toast({
        title: '¡Perfil Actualizado!',
        description: 'Tus datos han sido guardados correctamente.',
      });
      onOpenChange(false);
    } catch (error) {
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Mi Perfil</DialogTitle>
        <DialogDescription>
          Actualiza tus datos personales.
        </DialogDescription>
      </DialogHeader>
      <Form {...profileForm}>
        <form
          onSubmit={profileForm.handleSubmit(handleProfileUpdate)}
          className="space-y-4"
        >
          <FormField
            control={profileForm.control}
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
            control={profileForm.control}
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
          <FormField
            control={profileForm.control}
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
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

// Dialog for "My Appointments"
function AppointmentsDialog({ customerId }: { customerId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [appointmentToCancel, setAppointmentToCancel] = React.useState<Appointment | null>(null);

  const appointmentsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'customers', customerId, 'appointments'),
            where('status', '!=', 'cancelled')
          )
        : null,
    [firestore, customerId]
  );
  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsQuery);

  const servicesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
  const { data: services } = useCollection<Service>(servicesQuery);

  const stylistsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'stylists') : null, [firestore]);
  const { data: stylists } = useCollection<Stylist>(stylistsQuery);
  
  const handleCancelAppointment = async () => {
    if (!appointmentToCancel || !firestore) return;

    const batch = writeBatch(firestore);
    
    // Update appointment in customer's subcollection
    const customerAppointmentRef = doc(firestore, 'customers', customerId, 'appointments', appointmentToCancel.id);
    batch.update(customerAppointmentRef, { status: 'cancelled' });

    // Update appointment in admin_appointments
    const adminAppointmentRef = doc(firestore, 'admin_appointments', appointmentToCancel.id);
    batch.update(adminAppointmentRef, { status: 'cancelled' });
    
    // Update appointment in stylist's subcollection
    const stylistAppointmentRef = doc(firestore, 'stylists', appointmentToCancel.stylistId, 'appointments', appointmentToCancel.id);
    batch.update(stylistAppointmentRef, { status: 'cancelled' });

    try {
        await batch.commit();
        toast({
            title: 'Cita Cancelada',
            description: 'Tu cita ha sido cancelada exitosamente.',
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mis Citas</DialogTitle>
          <DialogDescription>
            Aquí puedes ver y gestionar tus próximas citas.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : appointments && appointments.length > 0 ? (
            <ul className="space-y-4">
              {appointments
                .sort((a, b) => a.start.toDate().getTime() - b.start.toDate().getTime())
                .map((app) => {
                  const service = services?.find((s) => s.id === app.serviceId);
                  const stylist = stylists?.find((s) => s.id === app.stylistId);
                  const isScheduled = app.status === 'scheduled';
                  return (
                    <li
                      key={app.id}
                      className="rounded-lg border p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {service?.name || 'Servicio no encontrado'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          con {stylist?.name || 'Estilista no encontrado'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(app.start.toDate(), "eeee, d 'de' MMMM, yyyy 'a las' p", { locale: es })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            isScheduled ? 'secondary' : 'default'
                          }
                          className="capitalize"
                        >
                          {isScheduled ? 'Por Confirmar' : 'Confirmada'}
                        </Badge>
                        {isScheduled && (
                          <Button variant="ghost" size="sm" onClick={() => setAppointmentToCancel(app)}>
                            <XCircle className="mr-2 h-4 w-4" /> Cancelar
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tienes citas próximas.
            </p>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={!!appointmentToCancel} onOpenChange={(isOpen) => !isOpen && setAppointmentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres cancelar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La cita se marcará como cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAppointment} className="bg-destructive hover:bg-destructive/90">
              Sí, Cancelar Cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Main Component
export default function UserAuth() {
  const { user, isUserLoading, logout } = useAuth();
  const firestore = useFirestore();
  const [dialog, setDialog] = React.useState<'appointments' | 'profile' | null>(null);

  const customerDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
    [user, firestore]
  );
  const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerDocRef);
  
  const isAdmin = user?.email === 'admin@divas.com';

  if (isUserLoading || (user && !isAdmin && isCustomerLoading)) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user && !isAdmin && customer) {
    return (
      <Dialog onOpenChange={(open) => !open && setDialog(null)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              <span>Mi Cuenta</span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p>Hola,</p>
              <p className="font-semibold">{customer.firstName}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={() => setDialog('appointments')}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Mis Citas</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={() => setDialog('profile')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {dialog === 'appointments' && <AppointmentsDialog customerId={customer.id} />}
        {dialog === 'profile' && <ProfileDialog customer={customer} onOpenChange={() => setDialog(null)} />}
      </Dialog>
    );
  }

  // Default state: not logged in or is admin (admin login is elsewhere)
  return <AuthDialog />;
}

    