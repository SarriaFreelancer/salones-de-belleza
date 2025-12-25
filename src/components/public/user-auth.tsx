'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CardContent } from '../ui/card';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Customer } from '@/lib/types';


export default function UserAuth() {
  const { user, isAuthLoading, clientLogin, clientSignup, logout } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 'login', 'signup', or 'firstTimeSignup'
  const [authMode, setAuthMode] = useState('login'); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  const { toast } = useToast();

  const resetForm = () => {
    setLoading(false);
    setError('');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setAuthMode('login');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await clientLogin(email, password);
      handleOpenChange(false);
    } catch (error: any) {
      if (firestore && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
        // Auth user doesn't exist, let's check if a customer profile exists
        const customersRef = collection(firestore, 'customers');
        const q = query(customersRef, where('email', '==', email.trim().toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // A customer profile exists! This is their first login.
          const customerData = querySnapshot.docs[0].data() as Customer;
          setFirstName(customerData.firstName);
          setLastName(customerData.lastName);
          setPhone(customerData.phone);
          setError('¡Bienvenida! Como es tu primera vez, por favor crea una contraseña para tu cuenta.');
          setAuthMode('firstTimeSignup');
        } else {
          // No customer profile, so they are a new user
          setError('No se encontró una cuenta con este correo. ¿Quieres registrarte?');
          setAuthMode('signup');
        }
      } else {
         setError('Las credenciales son incorrectas. Inténtalo de nuevo.');
      }
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await clientSignup(email, password, firstName, lastName, phone);
      handleOpenChange(false);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado. Por favor, inicia sesión.');
        setAuthMode('login');
      } else {
        setError('Ocurrió un error al registrar la cuenta.');
      }
      setLoading(false);
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
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'Usuario'} />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.displayName || 'Cliente'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserIcon className="mr-2 h-4 w-4" />
          Ingresar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Tabs value={authMode} onValueChange={(val) => { setAuthMode(val); setError('') }} className="w-full">
          <DialogHeader>
            <DialogTitle className="text-center font-headline text-2xl">
                {authMode === 'login' && 'Bienvenida de Nuevo'}
                {authMode === 'signup' && 'Crea Tu Cuenta'}
                {authMode === 'firstTimeSignup' && 'Activa Tu Cuenta'}
            </DialogTitle>
          </DialogHeader>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" disabled={authMode === 'firstTimeSignup'}>Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup" disabled={authMode === 'firstTimeSignup'}>Registrarse</TabsTrigger>
            </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Ingresa a tu cuenta para agendar y gestionar tus citas.
                </DialogDescription>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input id="login-email" type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </CardContent>
              <DialogFooter className="px-0">
                  {error && <p className="text-sm font-medium text-destructive text-center w-full">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Verificando...' : 'Iniciar Sesión'}</Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Únete para agendar citas fácilmente.
                </DialogDescription>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">Nombre</Label>
                    <Input id="signup-firstname" placeholder="Ana" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Apellido</Label>
                    <Input id="signup-lastname" placeholder="García" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Teléfono</Label>
                  <Input id="signup-phone" placeholder="3001234567" value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input id="signup-email" type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </CardContent>
              <DialogFooter className="px-0">
                  {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creando cuenta...' : 'Registrarse'}</Button>
              </DialogFooter>
            </form>
          </TabsContent>

           <TabsContent value="firstTimeSignup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4 px-0 pt-4">
                 <DialogDescription className="text-center">
                    Tu perfil ya fue creado por un administrador. Por favor, establece una contraseña para activar tu cuenta.
                </DialogDescription>
                <div className="space-y-2">
                  <Label htmlFor="first-email">Correo Electrónico</Label>
                  <Input id="first-email" type="email" value={email} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first-password">Nueva Contraseña</Label>
                  <Input id="first-password" type="password" placeholder="Crea una contraseña segura" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </CardContent>
              <DialogFooter className="px-0">
                  {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Activando...' : 'Guardar Contraseña y Continuar'}</Button>
              </DialogFooter>
            </form>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
