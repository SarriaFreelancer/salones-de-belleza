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
import { Loader2, User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  email: z.string().email('El correo electrónico no es válido.'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 caracteres.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

function AuthForm({
  isLogin,
  onLogin,
  onSignup,
  isLoading,
}: {
  isLogin: boolean;
  onLogin: (values: any) => void;
  onSignup: (values: any) => void;
  isLoading: boolean;
}) {
  const formSchema = isLogin ? loginSchema : signupSchema;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isLogin
      ? { email: '', password: '' }
      : { firstName: '', lastName: '', email: '', phone: '', password: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(isLogin ? onLogin : onSignup)} className="space-y-4">
        {!isLogin && (
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
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ana@ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isLogin && (
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
        )}
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
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
        </Button>
      </form>
    </Form>
  );
}

function AuthDialog() {
  const [open, setOpen] = React.useState(false);
  const [isLoginView, setIsLoginView] = React.useState(true);
  const { clientLogin, clientSignup } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await clientLogin(values.email, values.password);
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: error.message || 'Credenciales incorrectas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    try {
      await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al registrarse',
        description: error.message || 'No se pudo crear la cuenta.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <User className="mr-2" />
          Agendar / Ingresar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-8 border-2 shadow-lg">
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-2xl font-headline">
            {isLoginView ? 'Bienvenida de Vuelta' : 'Crea tu Cuenta'}
          </DialogTitle>
          <DialogDescription>
            {isLoginView
              ? 'Ingresa tus datos para acceder a tu perfil.'
              : 'Regístrate para agendar y gestionar tus citas.'}
          </DialogDescription>
        </DialogHeader>
        <AuthForm
          isLogin={isLoginView}
          onLogin={handleLogin}
          onSignup={handleSignup}
          isLoading={isLoading}
        />
        <p className="text-center text-sm text-muted-foreground">
          {isLoginView ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          <Button
            variant="link"
            className="pl-2"
            onClick={() => setIsLoginView(!isLoginView)}
          >
            {isLoginView ? 'Regístrate aquí' : 'Inicia sesión aquí'}
          </Button>
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default function UserAuth() {
  const { user, isUserLoading, logout } = useAuth();

  if (isUserLoading) {
    return <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />;
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`}
                alt={user.displayName || user.email || 'Usuario'}
                data-ai-hint="person face"
              />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.displayName || 'Bienvenida'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            Cerrar Sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return <AuthDialog />;
}
