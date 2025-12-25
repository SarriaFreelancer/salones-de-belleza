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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { useFirestore, useFirebaseAuth } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function UserAuth() {
  const {
    user,
    isAuthLoading,
    clientLogin,
    clientSignup,
    logout,
  } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'login' | 'signup' | 'resetPassword'>('login');
  
  // State for login/signup
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  // State for signup
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  
  // State for password reset
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [tempPassword, setTempPassword] = React.useState(''); // To store the initial wrong password

  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  const firestore = useFirestore();
  const auth = useFirebaseAuth();


  const resetForm = () => {
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setNewPassword('');
      setConfirmPassword('');
      setTempPassword('');
      setError('');
      setLoading(false);
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        resetForm();
        setMode('login'); // Reset to login mode when closing
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await clientLogin(email, password);
      // On success, close the dialog
      handleOpenChange(false);
    } catch (err: any) {
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            try {
                // Check if the user was created by an admin
                const q = query(collection(firestore, 'customers'), where('email', '==', email));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    // User exists, so trigger the password update flow
                    setTempPassword(password); // Store the entered (incorrect) password
                    setMode('resetPassword');
                    setError('Tu cuenta fue creada por un administrador. Por favor, establece tu nueva contraseña.');
                } else {
                    setError('La contraseña o el correo son incorrectos.');
                }
            } catch (fsError) {
                console.error("Firestore error during login check:", fsError);
                setError('Ocurrió un error al verificar tu cuenta.');
            }
        } else {
             console.error("Login error:", err);
            setError('Ocurrió un error inesperado al iniciar sesión.');
        }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
    }
    if (newPassword.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    setLoading(true);

    const currentUser = auth.currentUser;
    if (!currentUser) {
        // This case is tricky. The user isn't logged in. We need to log them in with a temporary password if available.
        // For simplicity, we'll guide them through login again. A more robust flow may require temporary tokens.
        try {
            // We need to re-authenticate the user with the password they *entered*
            const credential = EmailAuthProvider.credential(email, tempPassword);
            const userCredential = await signInWithEmailAndPassword(auth, email, tempPassword);

            if (userCredential.user) {
                await updatePassword(userCredential.user, newPassword);
                 toast({
                    title: '¡Contraseña Actualizada!',
                    description: 'Tu contraseña se ha cambiado correctamente. Por favor, inicia sesión de nuevo.',
                });
                setMode('login');
                resetForm();
            }

        } catch (reauthError: any) {
             console.error("Re-authentication or password update error:", reauthError);
             if (reauthError.code === 'auth/wrong-password') {
                setError('La contraseña original no es válida para la re-autenticación.');
             } else {
                setError('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
             }
        } finally {
            setLoading(false);
        }
        return;
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await clientSignup(email, password, firstName, lastName, phone);
      handleOpenChange(false);
    } catch (err: any) {
        console.error("Signup error:", err);
        if (err.code === 'auth/email-already-in-use') {
            setError('Este correo electrónico ya está registrado.');
        } else {
            setError('Ocurrió un error al registrar la cuenta.');
        }
    } finally {
      setLoading(false);
    }
  };


  if (isAuthLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="person face" />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>Mi Cuenta</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Mis Citas</DropdownMenuItem>
          <DropdownMenuItem disabled>Mi Perfil</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserCircle2 className="mr-2 h-4 w-4" />
          Ingresar / Registro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Tabs value={mode} onValueChange={(value) => setMode(value as any)} className="w-full">
            <DialogHeader>
                <DialogTitle className="text-2xl font-headline text-center">
                {mode === 'login' && 'Bienvenida de Vuelta'}
                {mode === 'signup' && 'Crea Tu Cuenta'}
                {mode === 'resetPassword' && 'Establece tu Contraseña'}
                </DialogTitle>
                <TabsList className="grid w-full grid-cols-2 mx-auto max-w-sm">
                    <TabsTrigger value="login" disabled={mode === 'resetPassword'}>Ingresar</TabsTrigger>
                    <TabsTrigger value="signup" disabled={mode === 'resetPassword'}>Registro</TabsTrigger>
                </TabsList>
            </DialogHeader>

          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Ingresa a tu cuenta para agendar y gestionar tus citas.
                </DialogDescription>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input id="login-email" type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </Button>
              </CardContent>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Regístrate para agendar citas de forma rápida y sencilla.
                 </DialogDescription>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre</Label>
                        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                 </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                 {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creando Cuenta...' : 'Registrarme'}
                </Button>
              </CardContent>
            </form>
          </TabsContent>

          <TabsContent value="resetPassword">
            <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-4 px-0 pt-4">
                    <DialogDescription className="text-center text-accent-foreground">
                        {error || 'Para proteger tu cuenta, por favor establece una nueva contraseña.'}
                    </DialogDescription>
                    <div className="space-y-2">
                    <Label htmlFor="reset-email">Correo Electrónico</Label>
                    <Input id="reset-email" type="email" value={email} disabled />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva Contraseña</Label>
                    <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </Button>
                </CardContent>
            </form>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
