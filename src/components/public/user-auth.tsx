'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, Calendar, User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Service, Stylist } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import MyAppointments from './my-appointments';

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 caracteres.'),
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

type SignupFormValues = z.infer<typeof signupSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;

// =============================================
// UserMenu Component
// =============================================
function UserMenu({
  services,
  stylists,
}: {
  services: Service[];
  stylists: Stylist[];
}) {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/100/100`} data-ai-hint="person face" />
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.displayName || 'Cliente'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Sheet>
          <SheetTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Mis Citas</span>
            </DropdownMenuItem>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Mis Citas</SheetTitle>
            </SheetHeader>
            <MyAppointments userId={user!.id} services={services} stylists={stylists} />
          </SheetContent>
        </Sheet>
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Mi Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================
// AuthDialog Component
// =============================================
function AuthDialog({
  open,
  onOpenChange,
  services,
  stylists,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  stylists: Stylist[];
}) {
  const { clientSignup, clientLogin } = useAuth();
  const [mode, setMode] = React.useState<'login' | 'signup'>('login');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: errorsSignup },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: errorsLogin },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const handleSignup: SubmitHandler<SignupFormValues> = async (data) => {
    setIsLoading(true);
    try {
      await clientSignup(data.email, data.password, data.firstName, data.lastName, data.phone);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: 'destructive',
          title: 'Error de Registro',
          description: 'Este correo electrónico ya está registrado. Por favor, inicia sesión.',
        });
        setMode('login');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de Registro',
          description: error.message || 'No se pudo crear la cuenta.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    try {
      await clientLogin(data.email, data.password);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Inicio de Sesión',
        description: 'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acceso de Clientes</DialogTitle>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'signup')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleSubmitLogin(handleLogin)}>
              <div className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Ingresa a tu cuenta para agendar y gestionar tus citas.
                </DialogDescription>
                <div className="space-y-1">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input id="login-email" {...registerLogin('email')} />
                  {errorsLogin.email && <p className="text-xs text-destructive">{errorsLogin.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input id="login-password" type="password" {...registerLogin('password')} />
                  {errorsLogin.password && <p className="text-xs text-destructive">{errorsLogin.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSubmitSignup(handleSignup)}>
              <div className="space-y-4 px-0 pt-4">
                <DialogDescription className="text-center">
                    Crea una cuenta para agendar citas de forma rápida y sencilla.
                </DialogDescription>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="signup-firstName">Nombre</Label>
                    <Input id="signup-firstName" {...registerSignup('firstName')} />
                    {errorsSignup.firstName && <p className="text-xs text-destructive">{errorsSignup.firstName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signup-lastName">Apellido</Label>
                    <Input id="signup-lastName" {...registerSignup('lastName')} />
                    {errorsSignup.lastName && <p className="text-xs text-destructive">{errorsSignup.lastName.message}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-phone">Teléfono</Label>
                  <Input id="signup-phone" {...registerSignup('phone')} />
                  {errorsSignup.phone && <p className="text-xs text-destructive">{errorsSignup.phone.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input id="signup-email" {...registerSignup('email')} />
                  {errorsSignup.email && <p className="text-xs text-destructive">{errorsSignup.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input id="signup-password" type="password" {...registerSignup('password')} />
                  {errorsSignup.password && <p className="text-xs text-destructive">{errorsSignup.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// Main UserAuth Component
// =============================================
export default function UserAuth({
  services,
  stylists,
}: {
  services: Service[];
  stylists: Stylist[];
}) {
  const { user, isAuthLoading } = useAuth();
  const [open, setOpen] = React.useState(false);

  if (isAuthLoading) {
    return <Button variant="outline" disabled>Cargando...</Button>;
  }

  if (user) {
    return <UserMenu services={services} stylists={stylists} />;
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Iniciar Sesión
      </Button>
      <AuthDialog open={open} onOpenChange={setOpen} services={services} stylists={stylists} />
    </>
  );
}
