'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authUtils } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
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

  const signInWithGoogle = async () => {
    try {
      const { url, error } = await authUtils.signInWithGoogle();

      if (error) {
        throw new Error(error);
      }

      if (url) {
        // Redirect to Google OAuth
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
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
    signInWithGoogle,
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