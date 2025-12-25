'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, UserPlus, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useFirebaseAuth } from '@/firebase';

export default function UserAuth() {
  const { user, clientLogin, clientSignup, logout, isAuthLoading } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const { toast } = useToast();
  const auth = useFirebaseAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await clientLogin(email, password);
      setOpen(false);
    } catch (err: any) {
      console.error('Client login error:', err.code);
      if (err.code === 'auth/user-not-found') {
        setError('No existe una cuenta con este correo. Por favor, regístrate.');
      } else if (err.code === 'auth/wrong-password') {
        try {
          await sendPasswordResetEmail(auth, email);
          toast({
            title: 'Revisa tu correo',
            description: `Parece que ya tienes una cuenta. Te hemos enviado un correo a ${email} para que puedas establecer o restablecer tu contraseña.`,
            duration: 8000,
          });
          setOpen(false);
        } catch (resetError: any) {
          console.error('Password reset email error:', resetError.code);
          setError('Contraseña incorrecta. No pudimos enviar el correo de restablecimiento.');
        }
      } else {
        setError('Error al iniciar sesión. Inténtalo de nuevo.');
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
      await clientSignup(email, password, firstName, lastName, phone);
      setOpen(false);
    } catch (err: any) {
      console.error('Client signup error:', err.code);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado. Intenta iniciar sesión.');
      } else {
        setError('Error al registrar la cuenta. Inténtalo de nuevo.');
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
      <div className="flex items-center gap-2">
        <span className="text-sm hidden sm:inline">{user.email}</span>
        <Button variant="ghost" size="icon" onClick={logout} title="Cerrar Sesión">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCircle className="mr-2 h-4 w-4" />
          Ingresar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Tabs defaultValue="login" className="w-full">
          <DialogHeader>
            <DialogTitle>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Ingresar</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>
            </DialogTitle>
          </DialogHeader>
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Ingresa a tu cuenta para agendar y gestionar tus citas.
                </DialogDescription>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input id="login-email" type="email" placeholder="tu@correo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              </CardContent>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Ingresar
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Crea una cuenta para agendar tu primera cita.
                </DialogDescription>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="signup-firstName">Nombre</Label>
                        <Input id="signup-firstName" placeholder="Ana" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-lastName">Apellido</Label>
                        <Input id="signup-lastName" placeholder="García" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Teléfono</Label>
                  <Input id="signup-phone" type="tel" placeholder="3001234567" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input id="signup-email" type="email" placeholder="tu@correo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              </CardContent>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Crear Cuenta
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

