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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    // This function will now re-throw the error to be handled by the UI component.
    await signInWithEmailAndPassword(auth, email, pass);
    // Force a full page reload to ensure auth state is propagated everywhere.
    window.location.href = '/dashboard';
  }, [auth]);

  const signupAndAssignAdminRole = useCallback(async (email: string, pass: string): Promise<void> => {
    // This function creates the user and assigns the admin role in one atomic operation from the UI perspective.
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    if (newUser && firestore) {
      const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
      // CRITICAL: Ensure the role document is created before proceeding.
      await setDoc(adminRoleDoc, {});
    } else {
      throw new Error('No se pudo crear el usuario o la instancia de Firestore no está disponible.');
    }
  }, [auth, firestore]);


  const logout = useCallback(async () => {
    try {
      await signOut(auth);
       window.location.href = '/login';
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });
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
    <AuthContext.Provider value={{ user, isUserLoading, login, signupAndAssignAdminRole, logout }}>
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
