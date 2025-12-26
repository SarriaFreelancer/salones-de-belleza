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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, UserCircle, LogOut, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Customer, Appointment } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
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

function LoginTab({ onSuccessfulLogin }: { onSuccessfulLogin: () => void }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const { clientLogin } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await clientLogin(email, password);
      onSuccessfulLogin();
    } catch (err: any) {
      let friendlyError = 'No se pudo iniciar sesión. Verifica tus credenciales.';
      if (err.code === 'auth/invalid-credential') {
        friendlyError = 'El correo o la contraseña son incorrectos.';
      }
      setError(friendlyError);
      toast({
        variant: 'destructive',
        title: 'Error de Inicio de Sesión',
        description: friendlyError,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Iniciar Sesión
      </Button>
    </form>
  );
}

function SignupTab({ onSuccessfulSignup }: { onSuccessfulSignup: () => void }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const { clientSignup } = useAuth();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await clientSignup(email, password, firstName, lastName, phone);
      onSuccessfulSignup();
    } catch (err: any) {
      let friendlyError =
        'No se pudo crear la cuenta. Inténtalo de nuevo más tarde.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'Este correo electrónico ya está registrado.';
      } else if (err.code === 'auth/weak-password') {
        friendlyError = 'La contraseña debe tener al menos 6 caracteres.';
      }
      setError(friendlyError);
      toast({
        variant: 'destructive',
        title: 'Error de Registro',
        description: friendlyError,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            placeholder="Ana"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input
            id="lastName"
            placeholder="García"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="3001234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Correo Electrónico</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Contraseña</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Crear Cuenta
      </Button>
    </form>
  );
}

function AuthDialog() {
  const [open, setOpen] = React.useState(false);
  const handleSuccess = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Login / Registro</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="pt-4">
            <DialogHeader className="mb-4 text-left">
              <DialogTitle>Bienvenida de Vuelta</DialogTitle>
              <DialogDescription>
                Accede a tu cuenta para ver tus citas.
              </DialogDescription>
            </DialogHeader>
            <LoginTab onSuccessfulLogin={handleSuccess} />
          </TabsContent>
          <TabsContent value="signup" className="pt-4">
            <DialogHeader className="mb-4 text-left">
              <DialogTitle>Crea tu Cuenta</DialogTitle>
              <DialogDescription>
                Regístrate para agendar citas fácilmente.
              </DialogDescription>
            </DialogHeader>
            <SignupTab onSuccessfulSignup={handleSuccess} />
          </TabsContent>
        </Tabs>
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
  const { services } = useServices();
  const { stylists } = useStylists();

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
    error,
  } = useCollection<Appointment>(appointmentsCollection, true);

  const [appointmentToCancel, setAppointmentToCancel] = React.useState<
    Appointment | undefined
  >(undefined);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel || !firestore) return;
    setIsCancelling(true);
    try {
      const batch = writeBatch(firestore);
      const { id, customerId, stylistId } = appointmentToCancel;

      const adminRef = doc(firestore, 'admin_appointments', id);
      batch.update(adminRef, { status: 'cancelled' });

      const customerRef = doc(firestore, 'customers', customerId, 'appointments', id);
      batch.update(customerRef, { status: 'cancelled' });

      const stylistRef = doc(firestore, 'stylists', stylistId, 'appointments', id);
      batch.update(stylistRef, { status: 'cancelled' });
      
      await batch.commit();

      toast({
        title: 'Cita Cancelada',
        description: 'Tu cita ha sido cancelada exitosamente.',
      });
      setAppointmentToCancel(undefined);
    } catch (err) {
      console.error('Error al cancelar la cita:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          'No se pudo cancelar la cita. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const upcomingAppointments = React.useMemo(
    () =>
      (appointments || [])
        .filter((a) => (a.start as any).toDate() >= new Date())
        .sort((a, b) => (a.start as any).toDate() - (b.start as any).toDate()),
    [appointments]
  );

  const pastAppointments = React.useMemo(
    () =>
      (appointments || [])
        .filter((a) => (a.start as any).toDate() < new Date())
        .sort((a, b) => (b.start as any).toDate() - (a.start as any).toDate()),
    [appointments]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mis Citas</DialogTitle>
          <DialogDescription>
            Aquí puedes ver tus próximas citas y tu historial.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
          {isLoading && <Skeleton className="h-40 w-full" />}
          {!isLoading && (!appointments || appointments.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center p-8">
              <p className="text-muted-foreground">
                Aún no tienes ninguna cita agendada.
              </p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => onOpenChange(false)}
              >
                Agendar mi primera cita
              </Button>
            </div>
          )}

          {upcomingAppointments.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Próximas Citas</h3>
              {upcomingAppointments.map((app) => {
                const service = services.find((s) => s.id === app.serviceId);
                const stylist = stylists.find((s) => s.id === app.stylistId);
                const isCancelled = app.status === 'cancelled';

                return (
                  <div key={app.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{service?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          con {stylist?.name}
                        </p>
                      </div>
                      <Badge
                        variant={
                          isCancelled
                            ? 'destructive'
                            : app.status === 'confirmed'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {isCancelled ? 'Cancelada' : app.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      {format(
                        (app.start as any).toDate(),
                        "eeee, d 'de' MMMM, yyyy 'a las' p",
                        { locale: es }
                      )}
                    </p>
                    {!isCancelled && app.status !== 'cancelled' && (
                       <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setAppointmentToCancel(app)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cancelar Cita
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pastAppointments.length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="font-semibold text-lg">Historial de Citas</h3>
              {pastAppointments.map((app) => {
                 const service = services.find((s) => s.id === app.serviceId);
                 const stylist = stylists.find((s) => s.id === app.stylistId);
                return (
                   <div key={app.id} className="rounded-lg border p-4 space-y-2 opacity-70">
                     <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{service?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          con {stylist?.name}
                        </p>
                      </div>
                      <Badge
                        variant={
                          app.status === 'cancelled'
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {app.status === 'cancelled' ? 'Cancelada' : 'Realizada'}
                      </Badge>
                    </div>
                     <p className="text-sm">
                       {format(
                        (app.start as any).toDate(),
                        "eeee, d 'de' MMMM, yyyy",
                        { locale: es }
                      )}
                    </p>
                   </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
      <AlertDialog
        open={!!appointmentToCancel}
        onOpenChange={(isOpen) => !isOpen && setAppointmentToCancel(undefined)}
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
            <AlertDialogCancel>No, mantener cita</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAppointment} disabled={isCancelling}>
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, cancelar cita
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
  const { data: customer, isLoading } = useDoc<Customer>(customerDocRef, true);

  return (
     <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tus datos personales aquí.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <Skeleton className="h-60 w-full" />}
        {customer && <EditProfileForm customer={customer} onSaved={() => onOpenChange(false)} />}
         <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MyAccountManager() {
  const { logout } = useAuth();
  const [isAppointmentsOpen, setIsAppointmentsOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="pl-2">
             <UserCircle className="mr-2 h-5 w-5" />
             Mi Cuenta
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Gestionar Cuenta</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setIsAppointmentsOpen(true)}>
            Mis Citas
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsProfileOpen(true)}>
            Mi Perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout()}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MyAppointmentsDialog open={isAppointmentsOpen} onOpenChange={setIsAppointmentsOpen} />
      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </>
  );
}

export default function UserAuth() {
  const { user, isUserLoading, logout } = useAuth();
  const firestore = useFirestore();

  const customerDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
    [user, firestore]
  );
  const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerDocRef);

  if (isUserLoading || (user && isLoadingCustomer)) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user && customer) {
    const fallback = `${customer.firstName?.charAt(0) ?? ''}${customer.lastName?.charAt(0) ?? ''}`;
    return (
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-auto justify-start gap-2 pl-2 pr-3 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="person face" />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
             <span className="font-medium hidden sm:inline">Mi Cuenta</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p>{customer.firstName} {customer.lastName}</p>
            <p className="text-xs text-muted-foreground font-normal">{customer.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <MyAccountManager />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  if (user && !customer) {
    // Edge case: user exists in Auth but not in Firestore customers collection.
    // Allow them to log out.
    return (
       <Button variant="outline" onClick={() => logout()}>
        <LogOut className="mr-2 h-4 w-4" />
        Cerrar Sesión
       </Button>
    )
  }

  return <AuthDialog />;
}

    