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

export default function LoginPage() {
  const [email, setEmail] = React.useState('admin@divas.com');
  const [password, setPassword] = React.useState('12345678');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const { login, signupAndAssignAdminRole, user, isUserLoading } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast({
        title: '¡Bienvenido de vuelta!',
        description: 'Has iniciado sesión correctamente.',
      });
      router.push('/dashboard');
    } catch (loginError: any) {
      if (loginError.code === 'auth/invalid-credential' || loginError.code === 'auth/user-not-found') {
        // User doesn't exist, so try to create the first admin account.
        try {
          await signupAndAssignAdminRole(email, password);
          toast({
            title: '¡Cuenta de Administrador Creada!',
            description: 'Bienvenido. Tu cuenta de administrador ha sido creada.',
          });
          // After successful signup, the onAuthStateChanged listener will handle the redirect.
          // We can push to dashboard directly as well.
           router.push('/dashboard');
        } catch (signupError: any) {
          setError(`Error de registro: ${signupError.message}`);
        }
      } else {
        // Handle other login errors (e.g., wrong password, network error)
        setError(loginError.message || 'Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (isUserLoading || (!isUserLoading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
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
