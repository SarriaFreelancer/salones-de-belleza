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
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [email, setEmail] = React.useState('admin@divas.com');
  const [password, setPassword] = React.useState('12345678');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const authContext = useAuth();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const auth = getAuth();
    const firestore = getFirestore();

    try {
      // 1. Try to sign in
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Inicio de Sesión Exitoso',
        description: 'Redirigiendo al panel de control...',
      });
      window.location.href = '/dashboard';
    } catch (loginError: any) {
      // 2. If user does not exist, create a new admin user
      if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
        try {
          // Create the user
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = userCredential.user;

          // CRITICAL: Create the admin role document
          const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
          await setDoc(adminRoleDoc, {});
          
          toast({
            title: 'Cuenta de Admin Creada',
            description: 'Iniciando sesión por primera vez...',
          });

          // Now that user and role are created, sign in again to establish session
          await signInWithEmailAndPassword(auth, email, password);
          window.location.href = '/dashboard';

        } catch (signupError: any) {
          console.error("Signup Error:", signupError);
          setError(`Error de registro: ${signupError.message}`);
        }
      } else {
        // Handle other login errors (e.g., wrong password)
        console.error("Login Error:", loginError);
        setError(loginError.message || 'Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };


  if (!isClient || !authContext || authContext.isUserLoading) {
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
  
  if (authContext.user) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <Card className="w-full max-w-sm text-center">
                <CardHeader>
                    <CardTitle>Ya has iniciado sesión</CardTitle>
                    <CardDescription>
                        Has iniciado sesión como {authContext.user.email}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={() => router.push('/dashboard')}>Ir al Panel de Control</Button>
                    <Button variant="outline" onClick={authContext.logout}>
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
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
