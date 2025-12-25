'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = React.useState('admin@divas.com');
  const [password, setPassword] = React.useState('12345678');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  const { user, isAuthLoading, isAdmin, logout, login, signupAndAssignAdminRole } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
    const authError = searchParams.get('error');
    if (authError === 'access-denied') {
        setError('No tienes permisos de administrador.');
        toast({
            variant: 'destructive',
            title: 'Acceso Denegado',
            description: 'No tienes los permisos necesarios para acceder a esta página.'
        });
    }
  }, [searchParams, toast]);
  
  // This effect handles redirection AFTER authentication state is fully resolved.
  React.useEffect(() => {
    if (!isAuthLoading && user && isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAuthLoading, user, isAdmin, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, try to log in
      await login(email, password);
      // On success, the useEffect above will handle the redirect.
    } catch (err: any) {
      // If the user doesn't exist, try to sign them up as the first admin
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await signupAndAssignAdminRole(email, password);
           toast({
            title: '¡Cuenta de Admin Creada!',
            description: 'Bienvenida. Te hemos registrado como el primer administrador.',
          });
          // After signup, the useEffect will also handle the redirect once the user state updates.
        } catch (creationError: any) {
          console.error("Admin creation error:", creationError);
          const errorMessage = 'Error al crear la cuenta de administrador. ¿Contraseña incorrecta o el usuario ya existe con otras credenciales?';
          setError(errorMessage);
          toast({ variant: 'destructive', title: 'Error de Registro', description: errorMessage });
        }
      } else {
        // Handle other general login errors
        console.error("Login page error:", err.code, err.message);
        let errorMessage = 'Ha ocurrido un error inesperado.';
        switch (err.code) {
          case 'auth/wrong-password':
             errorMessage = 'La contraseña es incorrecta. Por favor, inténtalo de nuevo.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Has intentado iniciar sesión demasiadas veces. Inténtalo de nuevo más tarde.';
            break;
          default:
            errorMessage = 'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.';
            break;
        }
        setError(errorMessage);
        toast({ variant: 'destructive', title: 'Error de inicio de sesión', description: errorMessage });
      }
    } finally {
        setLoading(false);
    }
  };
  
  const LoginSkeleton = () => (
     <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Logo />
            </div>
            <Skeleton className="h-8 w-32 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-10 w-full" />
             </div>
             <div className="space-y-2">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-10 w-full" />
             </div>
             <Skeleton className="h-10 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
  );

  if (!isClient || isAuthLoading) {
    return <LoginSkeleton />;
  }
  
  // This state is for regular users who are logged in but are not admins.
  if (user && !isAdmin) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <Card className="w-full max-w-sm text-center">
                <CardHeader>
                    <CardTitle>Ya has iniciado sesión</CardTitle>
                    <CardDescription>
                        Has iniciado sesión como {user.email}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                   <p className="text-sm text-destructive">No tienes permisos de administrador.</p>
                    <Button variant="outline" onClick={() => logout()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  // Render login form if no user, or if user is not admin yet and auth is resolving.
  // The redirection logic in useEffect will handle moving an authenticated admin away from this page.
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle className="font-headline text-2xl">
            Admin Login
          </CardTitle>
          <CardDescription>
            Ingresa a tu panel de administración
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@divas.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
              />
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <p className="text-xs text-center text-muted-foreground pt-2">
              Si es la primera vez que inicias sesión, se creará una cuenta de administrador.
            </p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
