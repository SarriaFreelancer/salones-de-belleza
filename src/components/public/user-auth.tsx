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
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Calendar, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Service, Stylist, Customer } from '@/lib/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import MyAppointments from './my-appointments';

// Props definitions
interface UserAuthProps {
  services: Service[];
  stylists: Stylist[];
}

interface UserMenuProps {
  user: any;
  customer: Customer | null;
  services: Service[];
  stylists: Stylist[];
  onLogout: () => void;
}

interface AuthDialogProps {
  children: React.ReactNode;
}

// Schemas for forms
const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});
type LoginValues = z.infer<typeof loginSchema>;

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
    email: z.string().email('El correo electrónico no es válido.'),
    phone: z.string().min(7, 'El teléfono debe tener al menos 7 caracteres.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
type SignupValues = z.infer<typeof signupSchema>;


// ############################
// ### Sub-components
// ############################

function UserMenu({ user, customer, services, stylists, onLogout }: UserMenuProps) {
  const [isAppointmentsSheetOpen, setIsAppointmentsSheetOpen] = React.useState(false);
  const displayName = customer ? `${customer.firstName} ${customer.lastName}` : user.email;
  const fallback = displayName?.charAt(0).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt={displayName} data-ai-hint="person face" />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsAppointmentsSheetOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Mis Citas</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={isAppointmentsSheetOpen} onOpenChange={setIsAppointmentsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Mis Citas</SheetTitle>
            <SheetDescription>
              Aquí puedes ver tus próximas y pasadas citas.
            </SheetDescription>
          </SheetHeader>
          {user && (
            <MyAppointments
              userId={user.uid}
              services={services}
              stylists={stylists}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function AuthDialog({ children }: AuthDialogProps) {
    const { clientLogin, clientSignup } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);

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
        confirmPassword: '',
        },
    });

    const handleLogin = async (values: LoginValues) => {
        setIsLoading(true);
        try {
        await clientLogin(values.email, values.password);
        setOpen(false); // Close dialog on successful login
        loginForm.reset();
        } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al Iniciar Sesión',
            description: 'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.',
        });
        } finally {
        setIsLoading(false);
        }
    };

    const handleSignup = async (values: SignupValues) => {
        setIsLoading(true);
        try {
            await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
            setOpen(false);
            signupForm.reset();
        } catch (error: any) {
            let description = 'No se pudo crear la cuenta. Inténtalo de nuevo.';
            if (error.code === 'auth/email-already-in-use') {
                description = 'Este correo electrónico ya está registrado. Por favor, inicia sesión.';
            }
            toast({
                variant: 'destructive',
                title: 'Error de Registro',
                description,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle>Acceso de Clientes</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                    <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <Card className="border-0 shadow-none">
                        <CardHeader className="px-0">
                            <CardTitle>Bienvenida de Vuelta</CardTitle>
                            <CardDescription>
                                Ingresa a tu cuenta para agendar y gestionar tus citas.
                            </CardDescription>
                        </CardHeader>
                        <FormProvider {...loginForm}>
                             <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                                <CardContent className="space-y-4 px-0">
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
                                        <Input type="password" placeholder="********" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </CardContent>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Iniciar Sesión
                                </Button>
                            </form>
                        </FormProvider>
                    </Card>
                </TabsContent>
                <TabsContent value="register">
                     <Card className="border-0 shadow-none">
                        <CardHeader className="px-0">
                            <CardTitle>Crea tu Cuenta</CardTitle>
                            <CardDescription>
                                Es rápido y fácil. Podrás agendar citas en segundos.
                            </CardDescription>
                        </CardHeader>
                        <FormProvider {...signupForm}>
                             <form onSubmit={signupForm.handleSubmit(handleSignup)}>
                                <CardContent className="space-y-4 px-0">
                                    <div className="grid grid-cols-2 gap-4">
                                         <FormField control={signupForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ana" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField control={signupForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Apellido</FormLabel><FormControl><Input placeholder="García" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                     <FormField control={signupForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo</FormLabel><FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={signupForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="3001234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <div className="grid grid-cols-2 gap-4">
                                         <FormField control={signupForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </CardContent>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear Cuenta
                                </Button>
                            </form>
                        </FormProvider>
                    </Card>
                </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}


// ############################
// ### Main Component
// ############################

export default function UserAuth({ services, stylists }: UserAuthProps) {
  const { user, isAuthLoading, logout } = useAuth();
  const firestore = useFirestore();
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  
  React.useEffect(() => {
    if (user && firestore) {
      const fetchCustomerData = async () => {
        const customerDocRef = doc(firestore, 'customers', user.uid);
        const docSnap = await getDoc(customerDocRef);
        if (docSnap.exists()) {
          setCustomer(docSnap.data() as Customer);
        } else {
          console.warn(`No customer profile found for user ${user.uid}`);
          setCustomer(null);
        }
      };
      fetchCustomerData();
    } else {
      setCustomer(null);
    }
  }, [user, firestore]);

  if (isAuthLoading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando...
      </Button>
    );
  }

  if (user) {
    return (
      <UserMenu 
        user={user} 
        customer={customer} 
        services={services} 
        stylists={stylists} 
        onLogout={logout} 
      />
    );
  }

  return (
    <AuthDialog>
      <Button variant="outline">
        <UserIcon className="mr-2 h-4 w-4" />
        Iniciar Sesión
      </Button>
    </AuthDialog>
  );
}
