'use client';

import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { Auth, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth, useUser, useFirestore } from '@/firebase';
import { useToast } from './use-toast';
import { doc, setDoc, getDoc } from 'firebase/firestore'; 

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isAuthLoading: boolean; // Combines user loading and admin checking
  login: (email: string, pass: string) => Promise<void>;
  signupAndAssignAdminRole: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  // Client-specific auth methods remain
  clientSignup: (email: string, pass: string, firstName: string, lastName: string, phone: string) => Promise<void>;
  clientLogin: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading: isFirebaseUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isFirebaseUserLoading && user && firestore) {
        setIsCheckingAdmin(true);
        try {
          const adminRoleDocRef = doc(firestore, 'roles_admin', user.uid);
          const docSnap = await getDoc(adminRoleDocRef);
          setIsAdmin(docSnap.exists());
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } finally {
          setIsCheckingAdmin(false);
        }
      } else if (!isFirebaseUserLoading) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [user, firestore, isFirebaseUserLoading]);

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, pass);
  }, [auth]);

  const signupAndAssignAdminRole = useCallback(async (email: string, pass: string): Promise<void> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    if (newUser && firestore) {
      const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
      await setDoc(adminRoleDoc, {});
      
      const customerProfileDoc = doc(firestore, 'customers', newUser.uid);
      await setDoc(customerProfileDoc, {
        id: newUser.uid,
        firstName: 'Admin',
        lastName: 'User',
        email: newUser.email,
        phone: 'N/A',
      });

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
  
  const isAuthLoading = isFirebaseUserLoading || isCheckingAdmin;

  return (
    <AuthContext.Provider value={{ user, isAdmin, isAuthLoading, login, signupAndAssignAdminRole, logout, clientSignup, clientLogin }}>
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
