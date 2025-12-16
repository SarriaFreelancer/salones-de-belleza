'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useUser } from '@/firebase';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  isUserLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  
  return (
    <AuthContext.Provider value={{ user, isUserLoading }}>
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
