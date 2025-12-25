'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { CardContent } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { LogIn, UserCircle, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  sendPasswordResetEmail,
  type Auth,
} from 'firebase/auth';
import { useFirebaseAuth } from '@/firebase';


export default function UserAuth() {
  const { user, isAuthLoading, logout, clientLogin, clientSignup } = useAuth();
  const auth = useFirebaseAuth();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  
  const [signupFirstName, setSignupFirstName] = React.useState('');
  const [signupLastName, setSignupLastName] = React.useState('');
  const [signupEmail, setSignupEmail] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');
  const [signupPhone, setSignupPhone] = React.useState('');

  const resetForms = () => {
    setError('');
    setLoginEmail('');
    setLoginPassword('');
    setSignupFirstName('');
    setSignupLastName('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupPhone('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForms();
    }
    setOpen(isOpen);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await clientLogin(loginEmail, loginPassword);
      handleOpenChange(false);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
         try {
            await sendPasswordResetEmail(auth, loginEmail);
            setError(`Parece que ya tienes una cuenta. Te hemos enviado un correo a ${loginEmail} para que puedas establecer o restablecer tu contraseña.`);
            toast({
              title: 'Revisa tu Correo',
              description: `Te hemos enviado un enlace para que establezcas tu contraseña.`,
            });
         } catch (resetError: any) {
            setError('Tus credenciales no son correctas. Por favor, verifica e inténtalo de nuevo.');
         }

      } else {
        setError('Ocurrió un error inesperado al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await clientSignup(signupEmail, signupPassword, signupFirstName, signupLastName, signupPhone);
      handleOpenChange(false);
    } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
            setError('Este correo electrónico ya está registrado. Intenta iniciar sesión.');
        } else {
            setError('Ocurrió un error al crear la cuenta.');
        }
    } finally {
      setLoading(false);
    }
  };


  if (isAuthLoading) {
    return <Button variant="outline" size="sm" disabled>Cargando...</Button>;
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
               <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt={user.email || ''} data-ai-hint="person face" />
               <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Sesión Iniciada</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            Cerrar Sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LogIn className="mr-2 h-4 w-4" />
          Ingresar
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-w-sm">
        <Tabs defaultValue="login" className="w-full">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-2xl font-headline text-center">Bienvenida a Divas A&A</DialogTitle>
                 <TabsList className="grid w-full grid-cols-2 mt-4">
                    <TabsTrigger value="login">Ingresar</TabsTrigger>
                    <TabsTrigger value="signup">Registrarse</TabsTrigger>
                </TabsList>
            </DialogHeader>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 px-6 pt-4">
                 <DialogDescription className="text-center">
                    Ingresa a tu cuenta para agendar y gestionar tus citas.
                </DialogDescription>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input id="login-email" type="email" placeholder="tu@correo.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input id="login-password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-center text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ingresar'}
                </Button>
              </CardContent>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4 px-6 pt-4">
                 <DialogDescription className="text-center">
                    Crea tu cuenta para agendar una cita en segundos.
                </DialogDescription>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="signup-firstname">Nombre</Label>
                        <Input id="signup-firstname" placeholder="Ana" value={signupFirstName} onChange={e => setSignupFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-lastname">Apellido</Label>
                        <Input id="signup-lastname" placeholder="García" value={signupLastName} onChange={e => setSignupLastName(e.target.value)} required />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input id="signup-email" type="email" placeholder="tu@correo.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Teléfono</Label>
                  <Input id="signup-phone" type="tel" placeholder="3001234567" value={signupPhone} onChange={e => setSignupPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input id="signup-password" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
                </div>
                 {error && <p className="text-sm text-center text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Crear Cuenta'}
                </Button>
              </CardContent>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
