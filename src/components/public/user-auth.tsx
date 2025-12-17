
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '../ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  phone: z.string().min(7, 'El teléfono no parece válido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});


export default function UserAuth() {
  const { user, isAuthLoading, clientLogin, clientSignup, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        password: '',
    },
  });

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    try {
        await clientLogin(values.email, values.password);
        setOpen(false);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al Iniciar Sesión',
            description: error.message || 'Credenciales incorrectas. Por favor, inténtalo de nuevo.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onSignupSubmit = async (values: z.infer<typeof signupSchema>) => {
     setIsSubmitting(true);
    try {
        await clientSignup(values.email, values.password, values.firstName, values.lastName, values.phone);
        setOpen(false);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error en el Registro',
            description: error.message || 'No se pudo crear la cuenta. Por favor, inténtalo de nuevo.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  if (isAuthLoading) {
    return <Skeleton className="h-10 w-24" />;
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
               <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt={user.email || ''} data-ai-hint="person face" />
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
                {user.displayName || user.email}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                Cliente
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button>
                <UserIcon className="mr-2 h-4 w-4" />
                Ingresar
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Acceso de Clientes</DialogTitle>
                <DialogDescription>
                    Ingresa o crea una cuenta para poder agendar citas.
                </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Ingresar</TabsTrigger>
                    <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 pt-4">
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
                                            <Input type="password" placeholder="Tu contraseña" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ingresar
                            </Button>
                        </form>
                    </Form>
                </TabsContent>
                <TabsContent value="signup">
                     <Form {...signupForm}>
                        <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4 pt-4">
                                     <div className="grid grid-cols-2 gap-4">
                                             <FormField control={signupForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ana" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                             <FormField control={signupForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Apellido</FormLabel><FormControl><Input placeholder="García" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                         <FormField control={signupForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="3001234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={signupForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={signupForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" placeholder="Crea una contraseña segura" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
