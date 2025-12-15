'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { Auth, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth, useUser, useFirestore } from '@/firebase';
import { useToast } from './use-toast';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
      // Re-throw all login errors to be handled by the UI
      throw new Error(error.message || 'Error al iniciar sesión.');
    }
  }, [auth]);

  const signup = useCallback(async (email: string, pass: string): Promise<void> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser = userCredential.user;
      if (newUser && firestore) {
        // This is the crucial step: add the new user's UID to the admin roles collection.
        const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
        // We use a non-blocking set to create the role document.
        // The empty object {} is because we only care about the document's existence.
        setDocumentNonBlocking(adminRoleDoc, {}, { merge: false });
      }
    } catch (error: any) {
      // Re-throw all creation errors to be handled by the UI
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
