'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { Auth, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth, useUser, useFirestore } from '@/firebase';
import { useToast } from './use-toast';
import { doc, setDoc } from 'firebase/firestore'; 

interface AuthContextType {
  user: User | null;
  isUserLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signupAndAssignAdminRole: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  // New methods for public clients
  clientSignup: (email: string, pass: string, firstName: string, lastName: string, phone: string) => Promise<void>;
  clientLogin: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (signInError: any) {
      if (signInError.code === 'auth/user-not-found') {
        try {
          await signupAndAssignAdminRole(email, pass);
          // After creation, sign in the new user to establish the session
          await signInWithEmailAndPassword(auth, email, pass);
          toast({
            title: 'Cuenta de Admin Creada',
            description: '¡Bienvenido! Te hemos registrado como el primer administrador.',
          });
        } catch (signUpError: any) {
          console.error("Error creating admin account:", signUpError);
          throw new Error(`Error al crear la cuenta de admin: ${signUpError.message}`);
        }
      } else if (signInError.code === 'auth/invalid-credential') {
          // This error means the email exists but the password is wrong, or the user does not exist.
          // Since we already check for user-not-found, we can be more specific.
          // However, to be safe, we'll try to create it if it doesn't exist.
           try {
              await signupAndAssignAdminRole(email, pass);
              await signInWithEmailAndPassword(auth, email, pass);
               toast({
                title: 'Cuenta de Admin Creada',
                description: '¡Bienvenido! Te hemos registrado como el primer administrador.',
              });
           } catch (e) {
             throw new Error('Las credenciales son incorrectas o el usuario no existe.');
           }
      }
      else {
        console.error("Login error:", signInError);
        throw new Error(`Error de inicio de sesión: ${signInError.message}`);
      }
    }
  }, [auth, firestore, toast]);

  const signupAndAssignAdminRole = useCallback(async (email: string, pass: string): Promise<void> => {
    // This function creates the user and assigns the admin role.
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    if (newUser && firestore) {
      const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
      await setDoc(adminRoleDoc, {});
    } else {
      throw new Error('No se pudo crear el usuario o la instancia de Firestore no está disponible.');
    }
  }, [auth, firestore]);
  
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
      // Determine where to redirect after logout
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
    <AuthContext.Provider value={{ user, isUserLoading, login, signupAndAssignAdminRole, logout, clientSignup, clientLogin }}>
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
