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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Loader2, User, LogOut, Calendar, XCircle, ChevronDownIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
import { doc, writeBatch, collection } from 'firebase/firestore';
import type { Customer, Appointment } from '@/lib/types';
import { format } from 'date-fns';
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


// --- Login/Signup Dialog ---
const loginSchema = z.object({
  email: z.string().email('Correo electrónico no válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'El nombre es muy corto.'),
    lastName: z.string().min(2, 'El apellido es muy corto.'),
    phone: z.string().min(7, 'El teléfono no es válido.'),
    email: z.string().email('Correo electrónico no válido.'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });


function LoginTab({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { clientLogin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

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
        title: 'Error de inicio de sesión',
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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ingresar
        </Button>
      </form>
    </Form>
  );
}

function SignupTab({ onSignupSuccess }: { onSignupSuccess: () => void }) {
  const { clientSignup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

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
      onSignupSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar',
        description:
          'Este correo ya está en uso. Intenta iniciar sesión.',
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
        <div className="grid grid-cols-2 gap-4">
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
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear Cuenta
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Ingresar</TabsTrigger>
            <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="p-1 pt-4">
            <LoginTab onLoginSuccess={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="signup" className="p-1 pt-4">
            <SignupTab onSignupSuccess={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


// --- My Appointments Dialog ---
function MyAppointmentsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { services } = useServices();
  const { stylists } = useStylists();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = React.useState<string | null>(null);

  const appointmentsCollection = useMemoFirebase(
    () =>
      user && firestore
        ? collection(firestore, 'customers', user.uid, 'appointments')
        : null,
    [user, firestore]
  );

  const { data: appointments, isLoading } = useCollection<Appointment>(
    appointmentsCollection,
    true
  );

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!firestore || !user) return;
    setIsCancelling(appointment.id);
    try {
      const batch = writeBatch(firestore);
      const appointmentId = appointment.id;

      const adminAppointmentRef = doc(firestore, 'admin_appointments', appointmentId);
      batch.update(adminAppointmentRef, { status: 'cancelled' });

      const stylistAppointmentRef = doc(firestore, 'stylists', appointment.stylistId, 'appointments', appointmentId);
      batch.update(stylistAppointmentRef, { status: 'cancelled' });

      const customerAppointmentRef = doc(firestore, 'customers', user.uid, 'appointments', appointmentId);
      batch.update(customerAppointmentRef, { status: 'cancelled' });

      await batch.commit();

      toast({
        title: 'Cita Cancelada',
        description: `Tu cita ha sido cancelada.`,
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Cancelar',
        description: 'No se pudo cancelar la cita. Inténtalo de nuevo.',
      });
    } finally {
      setIsCancelling(null);
    }
  };

  const upcomingAppointments = appointments?.filter(a => a.status !== 'cancelled' && (a.start as any).toDate() > new Date()) || [];
  const pastAppointments = appointments?.filter(a => a.status !== 'cancelled' && (a.start as any).toDate() <= new Date()) || [];
  const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled') || [];


  return (
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
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Próximas Citas</h3>
                {upcomingAppointments.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingAppointments.map((app) => {
                      const service = services.find(s => s.id === app.serviceId);
                      const stylist = stylists.find(s => s.id === app.stylistId);
                      const appointmentDate = (app.start as any).toDate();
                      return (
                        <li key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border bg-background p-3 gap-3">
                          <div className="flex-1 space-y-1">
                            <p><strong>Servicio:</strong> {service?.name || 'N/A'}</p>
                            <p><strong>Estilista:</strong> {stylist?.name || 'N/A'}</p>
                            <p><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                          </div>
                          <div className="flex flex-col items-stretch sm:items-end gap-2">
                             <Badge variant={app.status === 'confirmed' ? 'default' : 'secondary'} className="capitalize self-start sm:self-auto">
                                {app.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                             </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleCancelAppointment(app)} disabled={isCancelling === app.id}>
                               {isCancelling === app.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>}
                               Cancelar
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">No tienes citas próximas.</p>}
              </div>
               <div>
                <h3 className="font-semibold mb-2">Historial de Citas</h3>
                {pastAppointments.length > 0 ? (
                  <ul className="space-y-3 opacity-70">
                     {pastAppointments.map((app) => {
                      const service = services.find(s => s.id === app.serviceId);
                      const stylist = stylists.find(s => s.id === app.stylistId);
                      const appointmentDate = (app.start as any).toDate();
                      return (
                        <li key={app.id} className="flex items-center justify-between rounded-md border bg-background p-3 gap-2">
                          <div className="flex-1 space-y-1">
                            <p><strong>Servicio:</strong> {service?.name || 'N/A'}</p>
                            <p><strong>Estilista:</strong> {stylist?.name || 'N/A'}</p>
                            <p><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                          </div>
                           <Badge variant={'default'} className="capitalize bg-green-600">Completada</Badge>
                        </li>
                      )
                    })}
                  </ul>
                ) : <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">No tienes citas pasadas.</p>}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Citas Canceladas</h3>
                {cancelledAppointments.length > 0 ? (
                  <ul className="space-y-3 opacity-50">
                     {cancelledAppointments.map((app) => {
                      const service = services.find(s => s.id === app.serviceId);
                      const stylist = stylists.find(s => s.id === app.stylistId);
                      const appointmentDate = (app.start as any).toDate();
                      return (
                        <li key={app.id} className="flex items-center justify-between rounded-md border bg-background p-3 gap-2">
                          <div className="flex-1 space-y-1">
                            <p><strong>Servicio:</strong> {service?.name || 'N/A'}</p>
                            <p><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' p", { locale: es })}</p>
                          </div>
                           <Badge variant={'destructive'} className="capitalize">Cancelada</Badge>
                        </li>
                      )
                    })}
                  </ul>
                ) : <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">No tienes citas canceladas.</p>}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// --- My Profile Dialog ---
function ProfileDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const firestore = useFirestore();

  const customerDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
    [user, firestore]
  );
  const { data: customer, isLoading } = useDoc<Customer>(customerDocRef, true);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información personal aquí.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : customer ? (
          <EditProfileForm customer={customer} onSave={() => onOpenChange(false)} />
        ) : (
          <p>No se pudo cargar la información del perfil.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}


// --- Main Auth Component ---
export default function UserAuth() {
  const { user, isUserLoading, logout } = useAuth();
  const [dialog, setDialog] = React.useState<'auth' | 'appointments' | 'profile' | null>(null);
  
  const handleLogout = () => {
    logout();
  };

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (!user) {
    return (
      <>
        <Button variant="outline" onClick={() => setDialog('auth')}>
          <User className="mr-2 h-4 w-4" />
          Ingresar
        </Button>
        <AuthDialog open={dialog === 'auth'} onOpenChange={(isOpen) => !isOpen && setDialog(null)} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt={user.email || ''} data-ai-hint="person face" />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>Mi Cuenta</span>
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog('appointments')}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Mis Citas</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('profile')}>
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

      <MyAppointmentsDialog open={dialog === 'appointments'} onOpenChange={(isOpen) => !isOpen && setDialog(null)} />
      <ProfileDialog open={dialog === 'profile'} onOpenChange={(isOpen) => !isOpen && setDialog(null)} />
    </>
  );
}
