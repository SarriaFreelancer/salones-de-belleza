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
import { LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';


export default function LoginPage() {
  const [email, setEmail] = React.useState('admin@divas.com');
  const [password, setPassword] = React.useState('12345678');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  const { user, isAuthLoading, isAdmin, logout } = useAuth();
  const { auth, firestore } = useFirebase(); // Get auth and firestore instances
  const { toast } = useToast();
  
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, try to sign in
      await signInWithEmailAndPassword(auth, email, password);
      // Let the auth provider and protected layout handle the rest
      
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // If the user does not exist, try to create it as the first admin
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = userCredential.user;
          if (newUser && firestore) {
            // Assign the admin role
            const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
            await setDoc(adminRoleDoc, {});
            toast({
              title: '¡Cuenta de Admin Creada!',
              description: 'Bienvenida. Te hemos registrado como el primer administrador.',
            });
            // Successful sign-up will trigger onAuthStateChanged, and the app will react.
          }
        } catch (creationError: any) {
          // This might happen if the rules don't allow creating the first admin
          // or another error occurred during creation.
          console.error("Admin creation error:", creationError);
          const errorMessage = 'No se pudo crear la cuenta de administrador. ' + (creationError.message || '');
          setError(errorMessage);
          toast({
            variant: 'destructive',
            title: 'Error de Registro',
            description: errorMessage,
          });
        }
      } else {
        // Handle other login errors (wrong password, etc.)
        console.error("Login page error:", err.code, err.message);
        let errorMessage = 'Ha ocurrido un error inesperado.';
        if (err.code) {
          switch (err.code) {
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
              errorMessage = 'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.';
              break;
            case 'auth/too-many-requests':
              errorMessage = 'Has intentado iniciar sesión demasiadas veces. Inténtalo de nuevo más tarde.';
              break;
            default:
              errorMessage = err.message || errorMessage;
              break;
          }
        }
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error de inicio de sesión',
          description: errorMessage,
        });
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

  // Wait until client-side hydration and auth state is fully resolved
  if (!isClient || isAuthLoading) {
    return <LoginSkeleton />;
  }
  
  if (user) {
    // If a user is logged in, show the appropriate message based on their admin status.
    // The redirect to /dashboard is handled by ProtectedDashboardLayout.
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
                   {isAdmin ? (
                      <Button asChild>
                         <Link href="/dashboard">
                           <LayoutDashboard className="mr-2 h-4 w-4" />
                           Ir al Panel de Control
                         </Link>
                      </Button>
                   ) : (
                     <p className="text-sm text-muted-foreground">No tienes permisos de administrador.</p>
                   )}
                    <Button variant="outline" onClick={() => logout()}>
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
