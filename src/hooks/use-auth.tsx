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
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => void;
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
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        // If user does not exist, try to sign them up as the first admin
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          const newUser = userCredential.user;
          if (newUser && firestore) {
            const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
            await setDoc(adminRoleDoc, {});
          }
        } catch (signupError: any) {
           throw new Error(`Error al crear usuario administrador: ${signupError.message}`);
        }
      } else {
        // For other login errors (e.g., wrong password), re-throw
        throw new Error(error.message || 'Error al iniciar sesión.');
      }
    }
  }, [auth, firestore]);

  // Signup is now primarily for future use, login handles the first admin creation.
  const signup = useCallback(async (email: string, pass: string): Promise<void> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser = userCredential.user;
      if (newUser && firestore) {
        // This logic is now duplicated in login, but kept here for potential future separate signup flows.
        const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
        await setDoc(adminRoleDoc, {});
      }
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear el usuario.');
    }
  }, [auth, firestore]);


  const logout = useCallback(async () => {
    try {
      await signOut(auth);
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
    <AuthContext.Provider value={{ user, isUserLoading, login, signup, logout }}>
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
