import { User, Session } from '@supabase/supabase-js';

export interface AuthResponse {
  session: Session | null;
  user: User | null;
  error?: string;
}

export interface SignInResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface SignUpResponse {
  success: boolean;
  user?: User;
  session?: Session;
  message?: string;
  error?: string;
}

export const authUtils = {
  async getSession(): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (response.ok) {
        return {
          session: data.session,
          user: data.user
        };
      } else {
        return {
          session: null,
          user: null,
          error: data.error
        };
      }
    } catch (error) {
      console.error('Error getting session:', error);
      return {
        session: null,
        user: null,
        error: 'Failed to get session'
      };
    }
  },

  async signInWithEmail(email: string, password: string): Promise<SignInResponse> {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true,
          user: data.user,
          session: data.session
        };
      } else {
        return { 
          success: false,
          error: data.error || 'Sign in failed' 
        };
      }
    } catch (error) {
      console.error('Error signing in with email:', error);
      return { 
        success: false,
        error: 'Sign in failed' 
      };
    }
  },

  async signUpWithEmail(email: string, password: string): Promise<SignUpResponse> {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true,
          user: data.user,
          session: data.session,
          message: data.message
        };
      } else {
        return { 
          success: false,
          error: data.error || 'Sign up failed' 
        };
      }
    } catch (error) {
      console.error('Error signing up with email:', error);
      return { 
        success: false,
        error: 'Sign up failed' 
      };
    }
  },

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Sign out failed' };
      }
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: 'Sign out failed' };
    }
  }
}; 