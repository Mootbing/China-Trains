'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authUtils } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Get initial session
  useEffect(() => {
    getSession();
  }, []);

  const getSession = async () => {
    try {
      const { session: currentSession, user: currentUser, error } = await authUtils.getSession();
      
      if (error) {
        console.error('Failed to get session:', error);
      }
      
      setSession(currentSession);
      setUser(currentUser);
    } catch (error) {
      console.error('Error getting session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { success, user: signedInUser, session: userSession, error } = await authUtils.signInWithEmail(email, password);

      if (error) {
        return { success: false, error };
      }

      if (success && signedInUser && userSession) {
        setUser(signedInUser);
        setSession(userSession);
        return { success: true };
      }

      return { success: false, error: 'Sign in failed' };
    } catch (error) {
      console.error('Error signing in with email:', error);
      return { success: false, error: 'Sign in failed' };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { success, user: signedUpUser, session: userSession, message, error } = await authUtils.signUpWithEmail(email, password);

      if (error) {
        return { success: false, error };
      }

      if (success) {
        // If user is immediately confirmed (no email verification required)
        if (signedUpUser && userSession) {
          setUser(signedUpUser);
          setSession(userSession);
        }
        return { success: true, message };
      }

      return { success: false, error: 'Sign up failed' };
    } catch (error) {
      console.error('Error signing up with email:', error);
      return { success: false, error: 'Sign up failed' };
    }
  };

  const signOut = async () => {
    try {
      const { success, error } = await authUtils.signOut();

      if (error) {
        throw new Error(error);
      }

      if (success) {
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 