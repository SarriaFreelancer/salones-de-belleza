'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import {
  Loader2,
  CalendarDays,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import type { Appointment, Customer } from '@/lib/types';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import EditProfileForm from './edit-profile-form';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';
import { Badge } from '../ui/badge';


function AppointmentsList() {
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

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollection, true);
  
  const handleCancelAppointment = async () => {
    if (!appointmentToCancel || !user) return;
    
    setIsCancelling(true);
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
      console.error("Error cancelling appointment:", error);
      toast({
        variant: "destructive",
        title: "Error al cancelar",
        description: "No se pudo cancelar la cita. Inténtalo de nuevo más tarde."
      });
    } finally {
      setIsCancelling(false);
      setAppointmentToCancel(null);
    }
  }


  if (isLoadingAppointments) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const upcomingAppointments = (appointments || []).filter(a => {
    const appointmentDate = a.start instanceof Date ? a.start : a.start.toDate();
    return appointmentDate > new Date();
  });

  const pastAppointments = (appointments || []).filter(a => {
    const appointmentDate = a.start instanceof Date ? a.start : a.start.toDate();
    return appointmentDate <= new Date();
  }).sort((a,b) => (b.start instanceof Date ? b.start : b.start.toDate()).getTime() - (a.start instanceof Date ? a.start : a.start.toDate()).getTime());

  return (
    <>
      <div className="space-y-4">
        <h3 className="font-semibold">Próximas Citas</h3>
        {upcomingAppointments.length > 0 ? (
          <ul className="space-y-3">
            {upcomingAppointments.map((appointment) => {
              const service = services.find(s => s.id === appointment.serviceId);
              const stylist = stylists.find(s => s.id === appointment.stylistId);
              const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
              const isCancelled = appointment.status === 'cancelled';

              return (
                <li key={appointment.id} className="rounded-md border p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{service?.name || 'Servicio no encontrado'}</p>
                      <p className="text-sm text-muted-foreground">con {stylist?.name || 'Estilista no encontrado'}</p>
                    </div>
                    <Badge variant={isCancelled ? 'destructive' : 'default'} className="capitalize">
                      {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                    </Badge>
                  </div>
                  <p className="text-sm">{format(appointmentDate, "EEEE, d 'de' MMMM, yyyy 'a las' p", { locale: es })}</p>
                  {!isCancelled && (
                     <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAppointmentToCancel(appointment)}
                      disabled={isCancelling}
                    >
                      {isCancelling && appointmentToCancel?.id === appointment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancelar Cita"}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No tienes citas próximas.</p>}

        <h3 className="font-semibold pt-4">Historial de Citas</h3>
        {pastAppointments.length > 0 ? (
          <ul className="space-y-3 opacity-70">
            {pastAppointments.map((appointment) => {
              const service = services.find(s => s.id === appointment.serviceId);
              const stylist = stylists.find(s => s.id === appointment.stylistId);
              const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
              const isCancelled = appointment.status === 'cancelled';
              return (
                <li key={appointment.id} className="rounded-md border p-4 space-y-2">
                   <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{service?.name || 'Servicio no encontrado'}</p>
                      <p className="text-sm text-muted-foreground">con {stylist?.name || 'Estilista no encontrado'}</p>
                    </div>
                    <Badge variant={isCancelled ? 'destructive' : 'secondary'} className="capitalize">
                      {appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                    </Badge>
                  </div>
                  <p className="text-sm">{format(appointmentDate, "EEEE, d 'de' MMMM, yyyy 'a las' p", { locale: es })}</p>
                </li>
              )
            })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No tienes citas en tu historial.</p>}
      </div>

       <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas la cancelación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Tu espacio se liberará para otros clientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAppointment} disabled={isCancelling}>
               {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


function MyAppointmentsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mis Citas</DialogTitle>
          <DialogDescription>
            Aquí puedes ver tus próximas citas y tu historial.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2">
          <AppointmentsList />
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ProfileDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const firestore = useFirestore();

  const customerDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'customers', user.uid);
  }, [user, firestore]);

  const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerDocRef, true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tus datos personales aquí.
          </DialogDescription>
        </DialogHeader>
        {isLoadingCustomer ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <EditProfileForm customer={customer} onSave={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}


export default function UserAuth() {
  const {
    user,
    isUserLoading,
    clientLogin,
    clientSignup,
    logout
  } = useAuth();
  const [activeDialog, setActiveDialog] = React.useState<'login' | 'signup' | 'appointments' | 'profile' | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const email = e.currentTarget.email.value;
    const password = e.currentTarget.password.value;
    try {
      await clientLogin(email, password);
      setActiveDialog(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión',
        description:
          'Credenciales incorrectas. Por favor, inténtalo de nuevo.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const firstName = e.currentTarget.firstName.value;
    const lastName = e.currentTarget.lastName.value;
    const email = e.currentTarget.email.value;
    const phone = e.currentTarget.phone.value;
    const password = e.currentTarget.password.value;
    try {
      await clientSignup(email, password, firstName, lastName, phone);
      setActiveDialog(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de registro',
        description: 'No se pudo crear la cuenta. Inténtalo de nuevo.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (!user) {
    return (
      <>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveDialog('login')}>
            Iniciar Sesión
          </Button>
          <Button onClick={() => setActiveDialog('signup')}>Registrarse</Button>
        </div>

        <Dialog
          open={activeDialog === 'login'}
          onOpenChange={(open) => !open && setActiveDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Sesión</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Iniciar Sesión
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={activeDialog === 'signup'}
          onOpenChange={(open) => !open && setActiveDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Cuenta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" name="phone" required />
                </div>
              <div className="space-y-2">
                <Label htmlFor="email-signup">Correo Electrónico</Label>
                <Input id="email-signup" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Contraseña</Label>
                <Input
                  id="password-signup"
                  name="password"
                  type="password"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Crear Cuenta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-12">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="person face" />
              <AvatarFallback>
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
               <span className="font-semibold">Mi Cuenta</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActiveDialog('appointments')}>
             <CalendarDays className="mr-2 h-4 w-4" />
            <span>Mis Citas</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog('profile')}>
             <UserIcon className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
             <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MyAppointmentsDialog
        open={activeDialog === 'appointments'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      />
      <ProfileDialog
        open={activeDialog === 'profile'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      />
    </>
  );
}