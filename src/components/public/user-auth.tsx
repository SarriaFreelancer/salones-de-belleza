'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { CardContent } from '@/components/ui/card';

// Componente para el diálogo de autenticación (Login y Registro)
function AuthDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { clientLogin, clientSignup } = useAuth();
  const { toast } = useToast();
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [signupEmail, setSignupEmail] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');
  const [signupFirstName, setSignupFirstName] = React.useState('');
  const [signupLastName, setSignupLastName] = React.useState('');
  const [signupPhone, setSignupPhone] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await clientLogin(loginEmail, loginPassword);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      setError('Credenciales incorrectas. Inténtalo de nuevo.');
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: 'El correo o la contraseña son incorrectos.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await clientSignup(signupEmail, signupPassword, signupFirstName, signupLastName, signupPhone);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado. Por favor, inicia sesión.');
        toast({
          variant: 'destructive',
          title: 'Correo ya registrado',
          description: 'Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión.',
        });
      } else {
        setError('Ocurrió un error durante el registro.');
        toast({
          variant: 'destructive',
          title: 'Error de Registro',
          description: 'No se pudo crear la cuenta. Por favor, inténtalo de nuevo.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-center">Acceso de Clientes</DialogTitle>
            </DialogHeader>
             <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                    <TabsTrigger value="signup">Registrarse</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4 px-0 pt-4">
                            <DialogDescription className="text-center">
                                Ingresa a tu cuenta para agendar y gestionar tus citas.
                            </DialogDescription>
                            <div className="space-y-1">
                                <Label htmlFor="login-email">Correo Electrónico</Label>
                                <Input id="login-email" type="email" placeholder="tu@correo.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="login-password">Contraseña</Label>
                                <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                            </div>
                            {error && <p className="text-sm text-center font-medium text-destructive">{error}</p>}
                        </CardContent>
                        <DialogFooter>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Verificando...' : 'Iniciar Sesión'}
                            </Button>
                        </DialogFooter>
                    </form>
                </TabsContent>
                <TabsContent value="signup">
                     <form onSubmit={handleSignup}>
                        <CardContent className="space-y-4 px-0 pt-4">
                            <DialogDescription className="text-center">
                                Crea tu cuenta para una experiencia personalizada.
                            </DialogDescription>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="signup-firstname">Nombre</Label>
                                    <Input id="signup-firstname" placeholder="Ana" value={signupFirstName} onChange={(e) => setSignupFirstName(e.target.value)} required />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="signup-lastname">Apellido</Label>
                                    <Input id="signup-lastname" placeholder="García" value={signupLastName} onChange={(e) => setSignupLastName(e.target.value)} required />
                                </div>
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="signup-phone">Teléfono</Label>
                                <Input id="signup-phone" type="tel" placeholder="3001234567" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="signup-email">Correo Electrónico</Label>
                                <Input id="signup-email" type="email" placeholder="tu@correo.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="signup-password">Contraseña</Label>
                                <Input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                            </div>
                             {error && <p className="text-sm text-center font-medium text-destructive">{error}</p>}
                        </CardContent>
                        <DialogFooter>
                             <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Creando cuenta...' : 'Registrarse'}
                            </Button>
                        </DialogFooter>
                    </form>
                </TabsContent>
            </Tabs>
        </DialogContent>
    </Dialog>
  );
}

// Componente para el menú del usuario ya autenticado
function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
                <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/100/100`} alt={user?.displayName || user?.email || 'Usuario'} data-ai-hint="person face" />
                <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Ver Mis Citas</DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Componente principal que decide qué mostrar
export default function UserAuth() {
  const { user, isAuthLoading } = useAuth();
  const [open, setOpen] = React.useState(false);

  if (isAuthLoading) {
    return <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 animate-pulse bg-muted"></Button>;
  }

  if (user) {
    return <UserMenu />;
  }

  return (
    <>
        <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setOpen(true)}>
                <UserCircle2 className="mr-2 h-4 w-4" />
                Ingresar
            </Button>
        </DialogTrigger>
        <AuthDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
