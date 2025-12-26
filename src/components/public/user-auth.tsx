'use client';

import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  CalendarDays,
  User as UserIcon,
  LogOut,
  XCircle,
} from 'lucide-react';
import type { Appointment, Customer } from '@/lib/types';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useDoc } from '@/firebase/firestore/use-doc';
import EditProfileForm from '@/components/public/edit-profile-form';
import { cn } from '@/lib/utils';
import { cancelAppointment } from '@/ai/flows/cancel-appointment-flow';

function MyAppointmentsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { services } = useServices();
  const { stylists } = useStylists();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<Appointment | null>(null);

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

  const handleCancelClick = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
  };

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;

    setIsCancelling(appointmentToCancel.id);

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
        description:
          'No se pudo cancelar la cita. Por favor, intenta de nuevo más tarde.',
      });
    } finally {
      setIsCancelling(null);
      setAppointmentToCancel(null);
    }
  };

  const now = new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mis Citas</DialogTitle>
          <DialogDescription>
            Revisa, confirma o cancela tus citas agendadas.
          </DialogDescription>
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
                .sort(
                  (a, b) =>
                    (b.start as any).toDate().getTime() -
                    (a.start as any).toDate().getTime()
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
                  ).toDate() as Date;
                  const isPast = appointmentDate < now;
                  const canBeCancelled =
                    appointment.status === 'scheduled' && !isPast;

                  return (
                    <li
                      key={appointment.id}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center justify-between rounded-md border p-4 gap-4',
                        isPast && 'opacity-60'
                      )}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-lg">
                            {service?.name || 'Servicio Desconocido'}
                          </h4>
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
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Con {stylist?.name || 'Estilista Desconocido'}
                        </p>
                        <p className="text-sm">
                          {format(appointmentDate, "eeee, d 'de' MMMM, yyyy", {
                            locale: es,
                          })}{' '}
                          a las {format(appointmentDate, 'p', { locale: es })}
                        </p>
                      </div>
                      {canBeCancelled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelClick(appointment)}
                          disabled={isCancelling === appointment.id}
                        >
                          {isCancelling === appointment.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}
                          Cancelar Cita
                        </Button>
                      )}
                    </li>
                  );
                })}
            </ul>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <p>No tienes citas agendadas.</p>
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
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={handleConfirmCancel}
            >
              Sí, cancelar cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  const customerDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'customers', user.uid) : null),
    [user, firestore]
  );

  const { data: customer, isLoading } = useDoc<Customer>(customerDocRef, true);

  const handleProfileUpdate = () => {
    // This could trigger a re-fetch if needed, but useDoc handles it.
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información personal aquí.
          </DialogDescription>
        </DialogHeader>
        {isLoading && !customer ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : customer ? (
          <EditProfileForm
            customer={customer}
            onProfileUpdated={handleProfileUpdate}
          />
        ) : (
          <div className="text-center py-4">
            No se pudo cargar tu perfil.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UserAuth() {
  const { user, isUserLoading, logout, clientLogin, clientSignup } = useAuth();
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<
    'login' | 'signup' | 'appointments' | 'profile' | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthAction = async (
    action: 'login' | 'signup',
    data: Record<string, string>
  ) => {
    setIsLoading(true);
    try {
      if (action === 'login') {
        await clientLogin(data.email, data.password);
      } else {
        await clientSignup(
          data.email,
          data.password,
          data.firstName,
          data.lastName,
          data.phone
        );
      }
      setActiveDialog(null);
    } catch (error: any) {
      console.error(`${action} error:`, error);
      toast({
        variant: 'destructive',
        title: `Error de ${action === 'login' ? 'inicio de sesión' : 'registro'}`,
        description:
          error.code === 'auth/invalid-credential'
            ? 'Credenciales incorrectas. Inténtalo de nuevo.'
            : 'Ocurrió un error. Por favor, intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="person face" />
                <AvatarFallback>
                  {user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              Mi Cuenta
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
          onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
        />

        <ProfileDialog
          open={activeDialog === 'profile'}
          onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveDialog('login')}
        >
          Iniciar Sesión
        </Button>
        <Button size="sm" onClick={() => setActiveDialog('signup')}>
          Registrarse
        </Button>
      </div>

      <Dialog
        open={activeDialog === 'login' || activeDialog === 'signup'}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeDialog === 'login'
                ? '¡Bienvenida de vuelta!'
                : 'Crea tu cuenta'}
            </DialogTitle>
            <DialogDescription>
              {activeDialog === 'login'
                ? 'Ingresa tus datos para acceder a tu cuenta.'
                : 'Regístrate para agendar y gestionar tus citas fácilmente.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries()) as Record<
                string,
                string
              >;
              handleAuthAction(activeDialog!, data);
            }}
            className="space-y-4"
          >
            {activeDialog === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" name="phone" type="tel" required />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activeDialog === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
