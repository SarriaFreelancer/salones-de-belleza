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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { type Service, type Stylist } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';

const loginSchema = z.object({
  email: z
    .string()
    .email('El correo electrónico no es válido.')
    .min(1, 'El correo electrónico es requerido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre es requerido.'),
  lastName: z.string().min(2, 'El apellido es requerido.'),
  phone: z.string().min(7, 'El teléfono es requerido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

interface UserAuthProps {
    services: Service[];
    stylists: Stylist[];
}

function LoginForm() {
  const { clientLogin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(true);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    try {
      await clientLogin(values.email, values.password);
      setOpen(false); // Close dialog on success
    } catch (error: any) {
      console.error('Login error', error);
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description:
          'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
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
        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Iniciar Sesión
        </Button>
      </form>
    </Form>
  );
}

function SignupForm() {
  const { clientSignup } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(true);


  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    try {
      await clientSignup(
        values.email,
        values.password,
        values.firstName,
        values.lastName,
        values.phone
      );
      setOpen(false); // Close dialog on success
    } catch (error: any) {
      console.error('Signup error', error);
      toast({
        variant: 'destructive',
        title: 'Error al registrarse',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'Este correo electrónico ya está en uso.'
            : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear Cuenta
        </Button>
      </form>
    </Form>
  );
}


function AuthDialog({
  children,
}: {
  children: React.ReactNode;
  services: Service[];
  stylists: Stylist[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-2 shadow-lg rounded-xl">
        <Tabs defaultValue="login" className="w-full">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-2xl font-headline text-center">
              {/* This title will be replaced by the TabsList */}
            </DialogTitle>
            <DialogDescription className="text-center">
                Gestiona tus citas de forma rápida y sencilla.
            </DialogDescription>
             <TabsList className="grid w-full grid-cols-2 mx-auto">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
            </TabsList>
          </DialogHeader>
          
          <TabsContent value="login">
            <div className="px-6 pb-6">
                <LoginForm />
            </div>
          </TabsContent>
          <TabsContent value="register">
            <div className="px-6 pb-6">
                <SignupForm />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}



export default function UserAuth({ services, stylists }: UserAuthProps) {
  const { user, isUserLoading, logout } = useAuth();

  if (isUserLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user) {
    const userInitial = user.displayName
      ? user.displayName.charAt(0)
      : user.email?.charAt(0) || '?';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="person face" />
                        <AvatarFallback>{userInitial.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {user.displayName || user.email}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Ver mis citas</DropdownMenuItem>
                <DropdownMenuItem disabled>Editar perfil</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
    <AuthDialog services={services} stylists={stylists}>
      <Button variant="outline">
        Iniciar sesión
      </Button>
    </AuthDialog>
  );
}
