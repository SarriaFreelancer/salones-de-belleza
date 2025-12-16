'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = React.useState('admin@divas.com');
  const [password, setPassword] = React.useState('12345678');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    setError('');
    setLoading(true);

    try {
      // First, try to log in.
      await auth.login(email, password);
      // The login function now handles redirection via page reload.
    } catch (loginError: any) {
      // If login fails because the user doesn't exist, create the account.
      if (loginError.code === 'auth/invalid-credential' || loginError.code === 'auth/user-not-found') {
        try {
          // 1. Create user and assign admin role. Await its completion.
          await auth.signupAndAssignAdminRole(email, password);
          toast({
            title: 'Cuenta de Admin Creada',
            description: 'Iniciando sesión por primera vez...',
          });
          // 2. Now, log in with the newly created user. This will handle the redirect.
          await auth.login(email, password);
        } catch (signupError: any) {
          const errorMessage = signupError.message || 'Ocurrió un error desconocido durante el registro.';
          setError(`Error de registro: ${errorMessage}`);
          setLoading(false); // Stop loading on signup failure.
        }
      } else {
        // Handle other login errors (e.g., wrong password)
        const errorMessage = loginError.message || 'Error al iniciar sesión.';
        setError(errorMessage);
        setLoading(false); // Stop loading on other login failures.
      }
    }
  };


  if (!isClient || !auth || auth.isUserLoading) {
    return (
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
  }
  
  if (auth.user) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <Card className="w-full max-w-sm text-center">
                <CardHeader>
                    <CardTitle>Ya has iniciado sesión</CardTitle>
                    <CardDescription>
                        Has iniciado sesión como {auth.user.email}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={() => router.push('/dashboard')}>Ir al Panel de Control</Button>
                    <Button variant="outline" onClick={auth.logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }


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
              Si es la primera vez que inicias sesión, la cuenta de administrador se creará automáticamente.
            </p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
