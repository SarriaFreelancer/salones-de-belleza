'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Por favor, ingresa un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre es muy corto.'),
  lastName: z.string().min(2, 'El apellido es muy corto.'),
  phone: z.string().min(8, 'El teléfono no es válido.'),
  email: z.string().email('Por favor, ingresa un correo válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;


export default function UserAuth() {
  const { user, isUserLoading, logout, clientLogin, clientSignup } = useAuth();
  const [isAuthDialogOpen, setAuthDialogOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '' },
  });

  const handleLogin = async (values: LoginValues) => {
    setFormError(null);
    try {
      await clientLogin(values.email, values.password);
      setAuthDialogOpen(false);
    } catch (error: any) {
      setFormError('Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.');
      console.error(error);
    }
  };

  const handleSignup = async (values: SignupValues) => {
    setFormError(null);
    try {
      await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
      setAuthDialogOpen(false);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setFormError('Este correo electrónico ya está registrado. Intenta iniciar sesión.');
      } else {
        setFormError('Ocurrió un error al crear la cuenta. Por favor, inténtalo de nuevo.');
      }
      console.error(error);
    }
  };


  if (isUserLoading) {
    return <Skeleton className="h-10 w-24" />;
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? user.email ?? ''} />
              <AvatarFallback>
                <UserCircle />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName ?? 'Cliente'}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button onClick={() => setAuthDialogOpen(true)}>
        <LogIn className="mr-2 h-4 w-4" />
        Ingresar
      </Button>

      <Dialog open={isAuthDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <DialogHeader className="mb-4">
                <DialogTitle>Bienvenida de Vuelta</DialogTitle>
                <DialogDescription>
                  Ingresa a tu cuenta para agendar y gestionar tus citas.
                </DialogDescription>
              </DialogHeader>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
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
                   {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
                  <DialogFooter>
                    <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                      {loginForm.formState.isSubmitting ? 'Ingresando...' : 'Ingresar'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="signup">
              <DialogHeader className="mb-4">
                <DialogTitle>Crea tu Cuenta</DialogTitle>
                <DialogDescription>
                  Regístrate para agendar tu primera cita en minutos.
                </DialogDescription>
              </DialogHeader>
               <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={signupForm.control} name="firstName" render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={signupForm.control} name="lastName" render={({ field }) => (
                            <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                     <FormField control={signupForm.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={signupForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={signupForm.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
                    <DialogFooter>
                        <Button type="submit" className="w-full" disabled={signupForm.formState.isSubmitting}>
                            {signupForm.formState.isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                        </Button>
                    </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}