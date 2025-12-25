'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LogOut, User as UserIcon } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// --- Validation Schemas ---
const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 caracteres.'),
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;


// --- Sub-components for clarity ---

const UserMenu = () => {
    const { user, logout } = useAuth();
    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt={user.email || 'Usuario'} data-ai-hint="person face" />
                        <AvatarFallback>
                            {user.email?.[0].toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Mi Cuenta</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Add future items like 'Mis Citas' here */}
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const AuthDialog = () => {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const { toast } = useToast();
    const { clientLogin, clientSignup } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loginForm = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const signupForm = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '' },
    });

    useEffect(() => {
        if (!open) {
            setError('');
            setLoading(false);
            loginForm.reset();
            signupForm.reset();
        }
    }, [open, loginForm, signupForm]);

    const handleLogin = async (values: LoginValues) => {
        setLoading(true);
        setError('');
        try {
            await clientLogin(values.email, values.password);
            toast({ title: '¡Bienvenida de vuelta!', description: 'Has iniciado sesión correctamente.' });
            setOpen(false);
        } catch (err: any) {
            let message = 'Las credenciales son incorrectas. Inténtalo de nuevo.';
            if (err.code === 'auth/user-not-found') {
                 message = 'No se encontró una cuenta con este correo. ¿Quieres registrarte?';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSignup = async (values: SignupValues) => {
        setLoading(true);
        setError('');
        try {
            await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
            toast({ title: '¡Cuenta Creada!', description: 'Bienvenida. Ahora puedes agendar citas.' });
            setOpen(false);
        } catch (err: any) {
            let message = 'Ocurrió un error al crear tu cuenta.';
            if (err.code === 'auth/email-already-in-use') {
                message = 'Este correo ya está registrado. Por favor, inicia sesión.';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <UserIcon className="mr-2" />
                    Ingresar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'signup')} className="pt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                        <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
                    </TabsList>
                    
                    {/* --- Login Form --- */}
                    <TabsContent value="login">
                         <DialogHeader className="text-center pb-2">
                            <DialogTitle>¡Bienvenida de vuelta!</DialogTitle>
                            <DialogDescription>Ingresa a tu cuenta para agendar y gestionar tus citas.</DialogDescription>
                        </DialogHeader>
                        <Form {...loginForm}>
                            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                                <FormField control={loginForm.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={loginForm.control} name="password" render={({ field }) => (
                                    <FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                {error && <p className="text-sm text-center font-medium text-destructive">{error}</p>}
                                <DialogFooter>
                                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                    
                    {/* --- Signup Form --- */}
                    <TabsContent value="signup">
                        <DialogHeader className="text-center pb-2">
                            <DialogTitle>Crea tu Cuenta</DialogTitle>
                            <DialogDescription>Es rápido y fácil. Así podrás gestionar tus citas en un solo lugar.</DialogDescription>
                        </DialogHeader>
                         <Form {...signupForm}>
                            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-3">
                               <div className="grid grid-cols-2 gap-3">
                                     <FormField control={signupForm.control} name="firstName" render={({ field }) => (
                                        <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ana" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={signupForm.control} name="lastName" render={({ field }) => (
                                        <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input placeholder="García" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                               </div>
                                <FormField control={signupForm.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="3001234567" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={signupForm.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={signupForm.control} name="password" render={({ field }) => (
                                    <FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                {error && <p className="text-sm text-center font-medium text-destructive">{error}</p>}
                               <DialogFooter>
                                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creando cuenta...' : 'Crear Cuenta'}</Button>
                               </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Component ---

export default function UserAuth() {
  const { user } = useAuth();
  
  // Conditionally render the correct component based on authentication state.
  // The hooks are now encapsulated within their respective components, avoiding conditional hook calls here.
  return user ? <UserMenu /> : <AuthDialog />;
}
