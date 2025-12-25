'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, LogOut, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Service, Stylist } from '@/lib/types';
import PublicBookingForm from './public-booking-form';
import { Skeleton } from '../ui/skeleton';

const loginSchema = z.object({
  email: z
    .string()
    .email('El correo electrónico no es válido.')
    .min(1, 'El correo es requerido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const registerSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 caracteres.'),
  email: z
    .string()
    .email('El correo electrónico no es válido.')
    .min(1, 'El correo es requerido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function AuthDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { clientLogin, clientSignup, user, isUserLoading } = useAuth();
  const { toast } = useToast();
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  useEffect(() => {
    // If user logs in successfully while dialog is open, close it.
    if (user && (isLoginLoading || isRegisterLoading)) {
      setOpen(false);
    }
  }, [user, isLoginLoading, isRegisterLoading]);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  const onLoginSubmit = async (values: LoginValues) => {
    setIsLoginLoading(true);
    try {
      await clientLogin(values.email, values.password);
      // Success toast is handled in useAuth hook
    } catch (error: any) {
      console.error('Client login error:', error);
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description:
          'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterValues) => {
    setIsRegisterLoading(true);
    try {
      await clientSignup(
        values.email,
        values.password,
        values.firstName,
        values.lastName,
        values.phone
      );
      // Success toast is handled in useAuth hook
    } catch (error: any) {
      console.error('Client signup error:', error);
      let description = 'No se pudo crear tu cuenta. Inténtalo de nuevo.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este correo electrónico ya está registrado. Por favor, inicia sesión.';
      }
      toast({
        variant: 'destructive',
        title: 'Error de registro',
        description,
      });
    } finally {
      setIsRegisterLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 border-border shadow-lg">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card className="border-0 shadow-none">
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">
                  Bienvenida de nuevo
                </CardTitle>
                <CardDescription>
                  Ingresa tus datos para acceder a tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo Electrónico</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="tu@correo.com"
                              {...field}
                            />
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
                            <Input
                              type="password"
                              placeholder="********"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoginLoading || isUserLoading}
                    >
                      {isLoginLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogIn className="mr-2 h-4 w-4" />
                      )}
                      Iniciar Sesión
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="register">
            <Card className="border-0 shadow-none">
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">
                  Crea tu cuenta
                </CardTitle>
                <CardDescription>
                  Regístrate para agendar y gestionar tus citas fácilmente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
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
                        control={registerForm.control}
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
                      control={registerForm.control}
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
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo Electrónico</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="tu@correo.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Mínimo 8 caracteres"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isRegisterLoading || isUserLoading}
                    >
                      {isRegisterLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      Crear Cuenta
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function UserAuth() {
  const { user, isUserLoading, logout } = useAuth();

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt={user.displayName || user.email || ''} data-ai-hint="person face" />
              <AvatarFallback>
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.displayName || 'Cliente'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <AuthDialog>
      <Button variant="outline">
        <LogIn className="mr-2 h-4 w-4" />
        Acceder
      </Button>
    </AuthDialog>
  );
}
