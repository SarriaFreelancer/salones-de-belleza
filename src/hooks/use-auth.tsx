'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth, useUser, useFirestore } from '@/firebase';
import { useToast } from './use-toast';
import { doc, setDoc, getDoc } from 'firebase/firestore'; 

interface AuthContextType {
  user: User | null;
  isUserLoading: boolean;
  isAdmin: boolean;
  checkAdminStatus: () => Promise<boolean>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  clientSignup: (email: string, pass: string, firstName: string, lastName: string, phone: string) => Promise<void>;
  clientLogin: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = React.useState(false);

  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    if (!user || !firestore) {
      setIsAdmin(false);
      return false;
    }
    const adminRoleDoc = doc(firestore, 'roles_admin', user.uid);
    const docSnap = await getDoc(adminRoleDoc);
    const isAdminUser = docSnap.exists();
    setIsAdmin(isAdminUser);
    return isAdminUser;
  }, [user, firestore]);

  React.useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [user, checkAdminStatus]);

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      window.location.href = '/dashboard';
    } catch (signInError: any) {
      if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          const newUser = userCredential.user;
          const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
          await setDoc(adminRoleDoc, {});
          toast({
              title: 'Cuenta de Admin Creada',
              description: '¡Bienvenido! Te hemos registrado como administrador.',
          });
          window.location.href = '/dashboard';
        } catch (signUpError: any) {
          throw new Error(`Error al crear la cuenta de admin: ${signUpError.message}`);
        }
      } else {
        throw new Error(`Error de inicio de sesión: ${signInError.message}`);
      }
    }
  }, [auth, firestore, toast]);
  
  const clientLogin = useCallback(async (email: string, pass: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, pass);
    toast({
        title: '¡Bienvenida de vuelta!',
        description: 'Has iniciado sesión correctamente.',
    });
  }, [auth, toast]);

  const clientSignup = useCallback(async (email: string, pass: string, firstName: string, lastName: string, phone: string): Promise<void> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    if (newUser && firestore) {
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
    } else {
        throw new Error('No se pudo crear el usuario o la instancia de Firestore no está disponible.');
    }
  }, [auth, firestore, toast]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      if (window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/login';
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Firebase logout error:", error);
       toast({
        variant: "destructive",
        title: 'Error al cerrar sesión',
        description: 'Hubo un problema al cerrar la sesión. Inténtalo de nuevo.',
      });
    }
  }, [auth, toast]);

  return (
    <AuthContext.Provider value={{ user, isUserLoading, login, logout, clientSignup, clientLogin, isAdmin, checkAdminStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
