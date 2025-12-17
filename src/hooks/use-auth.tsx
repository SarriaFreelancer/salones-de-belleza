'use client';

import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { Auth, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth, useUser, useFirestore } from '@/firebase';
import { useToast } from './use-toast';
import { doc, setDoc, getDoc } from 'firebase/firestore'; 

interface AuthContextType {
  user: User | null;
  isUserLoading: boolean; // Firebase's user loading state
  isAdmin: boolean;
  isAuthLoading: boolean; // Our combined loading state (user + admin check)
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
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user && firestore) {
        setIsCheckingAdmin(true);
        const adminRoleDoc = doc(firestore, 'roles_admin', user.uid);
        try {
          const docSnap = await getDoc(adminRoleDoc);
          setIsAdmin(docSnap.exists());
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } finally {
          setIsCheckingAdmin(false);
        }
      } else {
        // No user, not an admin, and not checking
        setIsAdmin(false);
        setIsCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, firestore]);

  const signupAndAssignAdminRole = useCallback(async (email: string, pass: string): Promise<User> => {
    // This function creates the user and assigns the admin role.
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    if (newUser && firestore) {
      const adminRoleDoc = doc(firestore, 'roles_admin', newUser.uid);
      await setDoc(adminRoleDoc, {});
      setIsAdmin(true); // Immediately set admin state for the new user
      return newUser;
    } else {
      throw new Error('No se pudo crear el usuario o la instancia de Firestore no está disponible.');
    }
  }, [auth, firestore]);
  
  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // Admin status will be checked by the useEffect hook
    } catch (signInError: any) {
      // If user not found, it's the first login, so create admin account.
      if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
         try {
          // Check if it's an invalid password for an existing user first
           const userExistsSnap = await getDoc(doc(firestore, 'customers', auth.currentUser?.uid || ' '));
           if (signInError.code === 'auth/invalid-credential' && !userExistsSnap.exists()){
             throw new Error('La contraseña es incorrecta. Por favor, inténtalo de nuevo.');
           }
          
          await signupAndAssignAdminRole(email, pass);
          toast({
            title: '¡Cuenta de Admin Creada!',
            description: 'Bienvenida. Te hemos registrado como el primer administrador.',
          });
        } catch (signUpError: any) {
          console.error("Error creating admin account:", signUpError);
          // Don't re-throw the sign-in error, but the sign-up one if it happens
          throw new Error(signUpError.message || `Error al crear la cuenta de admin.`);
        }
      }
      else {
        console.error("Login error:", signInError);
        throw new Error(`Error de inicio de sesión: ${signInError.message}`);
      }
    }
  }, [auth, firestore, signupAndAssignAdminRole, toast]);


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
      // State will clear via onAuthStateChanged
      setIsAdmin(false);
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
  
  const isAuthLoading = isUserLoading || isCheckingAdmin;

  return (
    <AuthContext.Provider value={{ user, isUserLoading, isAdmin, isAuthLoading, login, logout, clientSignup, clientLogin }}>
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
