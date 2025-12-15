'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { Auth, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth, useUser } from '@/firebase';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  isUserLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const { toast } = useToast();

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
        } catch (creationError: any) {
            // Re-throw creation error to be caught by the UI
            throw new Error(`Error al crear usuario: ${creationError.message}`);
        }
      } else {
        // Re-throw other login errors
        throw new Error(`Error al iniciar sesión: ${error.message}`);
      }
    }
  }, [auth]);

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
    <AuthContext.Provider value={{ user, isUserLoading, login, logout }}>
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
