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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { LogOut, Loader2, Calendar } from 'lucide-react';
import { type Service, type Stylist, type Customer } from '@/lib/types';
import PublicBookingForm from './public-booking-form';
import MyAppointments from './my-appointments';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


// Schemas for the forms
const loginSchema = z.object({
  email: z.string().email('El correo no es válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre es requerido.'),
  lastName: z.string().min(2, 'El apellido es requerido.'),
  email: z.string().email('El correo no es válido.'),
  phone: z.string().min(7, 'El teléfono es requerido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

interface UserAuthProps {
  services: Service[];
  stylists: Stylist[];
}

function AuthDialog({
  open,
  onOpenChange,
  onLoginSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const { clientLogin, clientSignup } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const handleLogin = async (values: LoginValues) => {
    setLoading(true);
    try {
      await clientLogin(values.email, values.password);
      onLoginSuccess();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error de Inicio de Sesión',
        description: 'Credenciales incorrectas. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values: SignupValues) => {
    setLoading(true);
    try {
      await clientSignup(
        values.email,
        values.password,
        values.firstName,
        values.lastName,
        values.phone
      );
       toast({
        title: '¡Bienvenida!',
        description: 'Tu cuenta ha sido creada y has iniciado sesión.',
      });
      onLoginSuccess();
    } catch (error: any) {
      console.error(error);
      let description = 'No se pudo crear tu cuenta. Por favor, inténtalo de nuevo.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este correo electrónico ya está registrado. Por favor, inicia sesión.';
      }
      toast({
        variant: 'destructive',
        title: 'Error de Registro',
        description,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle>Acceso de Clientes</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 pt-4">
                        <DialogDescription className="text-center">
                            Ingresa a tu cuenta para agendar y gestionar tus citas.
                        </DialogDescription>
                        <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Correo Electrónico</FormLabel>
                            <FormControl>
                                <Input placeholder="tu@correo.com" {...field} />
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
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ingresar
                        </Button>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="signup">
                 <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4 pt-4">
                        <DialogDescription className="text-center">
                            Crea una cuenta para reservar tus citas fácil y rápido.
                        </DialogDescription>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={signupForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ana" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={signupForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Apellido</FormLabel><FormControl><Input placeholder="García" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={signupForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={signupForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="3001234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={signupForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" placeholder="Mínimo 8 caracteres" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" className="w-full" disabled={loading}>
                             {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Cuenta
                        </Button>
                    </form>
                </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
    </Dialog>
  );
}


function UserMenu({ services, stylists }: UserAuthProps) {
  const { user, logout } = useAuth();
  const firestore = useFirestore();
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const customerDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'customers', user.uid);
  }, [firestore, user]);
  
  const { data: customerProfile, isLoading: isLoadingProfile } = useDoc<Customer>(customerDocRef);


  if (!user || !isClient) {
    return null;
  }
  
  const getInitials = () => {
    if (isLoadingProfile || !customerProfile) return user.email?.charAt(0).toUpperCase();
    const firstNameInitial = customerProfile.firstName?.charAt(0) || '';
    const lastNameInitial = customerProfile.lastName?.charAt(0) || '';
    return `${firstNameInitial}${lastNameInitial}`;
  }

  return (
    <Sheet>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
                <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt="Avatar" data-ai-hint="person face" />
                <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                    {isLoadingProfile ? 'Cargando...' : `${customerProfile?.firstName} ${customerProfile?.lastName}`}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                </p>
            </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <SheetTrigger asChild>
                <DropdownMenuItem>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Mis Citas</span>
                </DropdownMenuItem>
            </SheetTrigger>
            <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>

        <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
                <SheetTitle>Mis Citas</SheetTitle>
                <SheetDescription>
                    Aquí puedes ver el historial de tus citas agendadas.
                </SheetDescription>
            </SheetHeader>
            <div className="mt-4">
                <MyAppointments userId={user.uid} services={services} stylists={stylists} />
            </div>
        </SheetContent>
    </Sheet>
  );
}


export default function UserAuth({ services, stylists }: UserAuthProps) {
  const { user, isAuthLoading } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLoginSuccess = () => {
    setDialogOpen(false);
  };
  
  if (!isClient || isAuthLoading) {
    return <Button variant="outline" disabled>Cargando...</Button>;
  }

  return (
    <>
      {user ? (
         <UserMenu services={services} stylists={stylists} />
      ) : (
        <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
                Ingresar / Registrarse
            </Button>
        </DialogTrigger>
      )}

      <AuthDialog 
        open={dialogOpen && !user} 
        onOpenChange={setDialogOpen}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
