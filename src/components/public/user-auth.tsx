'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Loader2, LogOut, UserCircle } from 'lucide-react';
import Link from 'next/link';

type AuthDialogMode = 'login' | 'signup';

export default function UserAuth() {
  const { user, isUserLoading, clientLogin, clientSignup, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<AuthDialogMode>('login');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset form on close
        setError('');
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
    }
    setOpen(isOpen);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        if (mode === 'login') {
            await clientLogin(email, password);
        } else {
            await clientSignup(email, password, firstName, lastName, phone);
        }
        handleOpenChange(false);
    } catch (err: any) {
        const defaultMessage = mode === 'login' ? 'Error al iniciar sesión.' : 'Error al registrarse.';
        setError(err.message || defaultMessage);
    } finally {
        setLoading(false);
    }
  };

  if (isUserLoading) {
    return <div className="h-10 w-24 rounded-md bg-muted animate-pulse" />;
  }
  
  if (user) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'user'} />
                        <AvatarFallback>
                            <UserCircle />
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName || 'Cliente'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/mis-citas">Mis Citas</Link>
                </DropdownMenuItem>
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
      <div className="flex items-center gap-2">
        <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setMode('login')}>Iniciar Sesión</Button>
        </DialogTrigger>
        <DialogTrigger asChild>
            <Button onClick={() => setMode('signup')}>Registrarse</Button>
        </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</DialogTitle>
          <DialogDescription>
            {mode === 'login' ? 'Ingresa tus datos para acceder a tu cuenta.' : 'Crea tu cuenta para agendar y gestionar tus citas.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
                <div className='grid grid-cols-2 gap-4'>
                     <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre</Label>
                        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
             {mode === 'signup' && (
                <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
            )}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
             <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
                </Button>
            </DialogFooter>
        </form>
        
        <div className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? '¿No tienes una cuenta? ' : '¿Ya tienes una cuenta? '}
            <Button variant="link" className="p-0 h-auto" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                 {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión aquí'}
            </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}