'use client';

import * as React from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { Skeleton } from '../ui/skeleton';
import type { Customer } from '@/lib/types';
import { CardContent } from '../ui/card';


export default function UserAuth() {
  const { user, isAuthLoading, logout } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  
  // Form states
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: '¡Bienvenida de vuelta!', description: 'Has iniciado sesión correctamente.' });
      setOpen(false);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('El correo electrónico o la contraseña son incorrectos.');
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

    if (!firestore) {
      setError('La base de datos no está disponible. Inténtalo de nuevo más tarde.');
      setLoading(false);
      return;
    }
    
    try {
        // Attempt to create the user directly.
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // Create the customer profile in Firestore
        const customerProfileDoc = doc(firestore, 'customers', newUser.uid);
        await setDoc(customerProfileDoc, {
            id: newUser.uid,
            firstName,
            lastName,
            email,
            phone,
        });

        toast({
            title: '¡Cuenta Creada!',
            description: 'Bienvenida. Ahora puedes agendar citas fácilmente.',
        });
        setOpen(false);

    } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
            setError('Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión.');
        } else if (err.code === 'auth/weak-password') {
            setError('La contraseña es demasiado débil. Debe tener al menos 6 caracteres.');
        } else {
            setError('Ocurrió un error al crear la cuenta. Inténtalo de nuevo.');
            console.error('Signup error:', err);
        }
    } finally {
        setLoading(false);
    }
  };


  if (!isClient || isAuthLoading) {
    return <Skeleton className="h-10 w-28" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium hidden sm:inline">
          {user.displayName || user.email}
        </span>
        <Button variant="ghost" size="icon" onClick={logout} title="Cerrar Sesión">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    );
  }
  
  const { auth, clientSignup, clientLogin } = useAuth();


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LogIn className="mr-2 h-4 w-4" />
          Ingresar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-center">
            Bienvenida a Divas A&A
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Ingresar</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
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
                   {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</Button>
                </CardContent>
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
                  {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creando Cuenta...' : 'Registrarse'}</Button>
                </CardContent>
              </form>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
