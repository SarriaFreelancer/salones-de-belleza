'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Service, Stylist } from '@/lib/types';
import MyAppointments from './my-appointments';

const loginSchema = z.object({
  email: z.string().email('Correo inválido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});
type LoginValues = z.infer<typeof loginSchema>;

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'El nombre es muy corto.'),
    lastName: z.string().min(2, 'El apellido es muy corto.'),
    phone: z.string().min(7, 'El teléfono no es válido.'),
    email: z.string().email('Correo inválido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
type SignupValues = z.infer<typeof signupSchema>;


interface UserAuthProps {
    services: Service[];
    stylists: Stylist[];
}

// --- Sub-components to keep UserAuth clean ---

const AuthDialog = ({ onOpenChange, open }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
  const { clientLogin, clientSignup } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState<'login' | 'signup' | null>(null);

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
      confirmPassword: '',
    },
  });

  const handleLogin = async (values: LoginValues) => {
    setLoading('login');
    try {
      await clientLogin(values.email, values.password);
      onOpenChange(false); // Close dialog on success
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al Iniciar Sesión',
        description:
          error.code === 'auth/invalid-credential'
            ? 'Las credenciales son incorrectas.'
            : 'Ocurrió un error. Inténtalo de nuevo.',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleSignup = async (values: SignupValues) => {
    setLoading('signup');
    try {
      await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
      onOpenChange(false); // Close dialog on success
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Error en el Registro',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'Este correo ya está registrado. Por favor, inicia sesión.'
            : 'Ocurrió un error. Inténtalo de nuevo.',
      });
    } finally {
      setLoading(null);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Acceder</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="signup">Registrarse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Ingresa a tu cuenta para agendar y gestionar tus citas.
                </DialogDescription>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo</Label>
                  <Input id="login-email" type="email" {...loginForm.register('email')} />
                  {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input id="login-password" type="password" {...loginForm.register('password')} />
                  {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="px-0">
                <Button className="w-full" type="submit" disabled={loading === 'login'}>
                    {loading === 'login' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Acceder
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="signup">
             <form onSubmit={signupForm.handleSubmit(handleSignup)}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Crea tu cuenta para una experiencia personalizada.
                </DialogDescription>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre</Label>
                        <Input id="firstName" {...signupForm.register('firstName')} />
                         {signupForm.formState.errors.firstName && <p className="text-xs text-destructive">{signupForm.formState.errors.firstName.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input id="lastName" {...signupForm.register('lastName')} />
                         {signupForm.formState.errors.lastName && <p className="text-xs text-destructive">{signupForm.formState.errors.lastName.message}</p>}
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" {...signupForm.register('phone')} />
                    {signupForm.formState.errors.phone && <p className="text-xs text-destructive">{signupForm.formState.errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo</Label>
                  <Input id="signup-email" type="email" {...signupForm.register('email')} />
                   {signupForm.formState.errors.email && <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input id="signup-password" type="password" {...signupForm.register('password')} />
                  {signupForm.formState.errors.password && <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>}
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input id="confirmPassword" type="password" {...signupForm.register('confirmPassword')} />
                  {signupForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="px-0">
                <Button className="w-full" type="submit" disabled={loading === 'signup'}>
                   {loading === 'signup' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};


const UserMenu = ({ services, stylists }: UserAuthProps) => {
    const { user, logout } = useAuth();
    const [showAppointments, setShowAppointments] = React.useState(false);

    // Fallback if user data is somehow not present
    if (!user) {
        return null;
    }
    
    // Get initials for Avatar
    const initials = user.displayName?.split(' ').map(n => n[0]).join('') || user.email?.charAt(0).toUpperCase() || 'U';

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt={user.displayName || 'Usuario'} data-ai-hint="person face" />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.displayName || 'Bienvenida'}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onSelect={() => setShowAppointments(true)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Mis Citas</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {user && (
                <MyAppointments 
                    open={showAppointments}
                    onOpenChange={setShowAppointments}
                    userId={user.uid}
                    services={services}
                    stylists={stylists}
                />
            )}
        </>
    );
};

// --- Main Component ---

export default function UserAuth({ services, stylists }: UserAuthProps) {
  const { user, isAuthLoading, isAdmin } = useAuth();
  const [open, setOpen] = React.useState(false);
  
  if (isAuthLoading) {
    return <Skeleton className="h-10 w-24" />;
  }

  // Regular users see the menu, admins are redirected so they don't see this button
  if (user && !isAdmin) {
    return <UserMenu services={services} stylists={stylists} />;
  }

  // Unauthenticated users see the login button
  return <AuthDialog open={open} onOpenChange={setOpen} />;
}
